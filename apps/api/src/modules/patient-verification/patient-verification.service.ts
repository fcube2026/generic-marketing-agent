import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RiskEngineService } from './risk-engine.service';
import { SmsService } from '../sms/sms.service';
import { ConfigService } from '@nestjs/config';
import {
  PatientVerificationStatus,
  ManualReviewReason,
  ReviewPriority,
  Prisma,
} from '@prisma/client';

/** Supabase signed upload URL TTL in seconds. */
const UPLOAD_URL_EXPIRY = 600;

/** Bucket used for patient ID documents. */
const ID_DOCS_BUCKET = 'patient-ids';

/**
 * Required steps per risk tier.
 */
function requiredSteps(tier: string): string[] {
  switch (tier) {
    case 'CRITICAL':
      return ['CLINICAL_INTAKE', 'CONSENT', 'ID_REQUIRED', 'MANUAL_REVIEW'];
    case 'HIGH':
      return ['CLINICAL_INTAKE', 'CONSENT', 'ID_REQUIRED'];
    case 'MEDIUM':
      return ['CLINICAL_INTAKE', 'CONSENT', 'ID_OPTIONAL'];
    default:
      return ['CLINICAL_INTAKE', 'CONSENT'];
  }
}

@Injectable()
export class PatientVerificationService {
  private readonly logger = new Logger(PatientVerificationService.name);
  private readonly supabaseUrl: string;
  private readonly supabaseKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly riskEngine: RiskEngineService,
    private readonly smsService: SmsService,
    private readonly config: ConfigService,
  ) {
    this.supabaseUrl = this.config.get<string>('SUPABASE_URL', '');
    this.supabaseKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY', '');
  }

  // ──────────────────────────────────────────────────
  // Patient-facing
  // ──────────────────────────────────────────────────

  async initiateVerification(patientUserId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { patient: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.patient.userId !== patientUserId)
      throw new ForbiddenException('Not your booking');

    const { score, tier, triggers } = await this.riskEngine.computeRiskScore({
      patientId: booking.patientId,
      totalFee: booking.totalFee,
      scheduledAt: booking.scheduledAt,
    });

    // Upsert verification record
    const verification = await this.prisma.patientVerification.upsert({
      where: { patientId: booking.patientId },
      update: {
        riskScore: score,
        riskTier: tier,
        riskTriggers: triggers,
        status: PatientVerificationStatus.OTP_VERIFIED,
      },
      create: {
        patientId: booking.patientId,
        riskScore: score,
        riskTier: tier,
        riskTriggers: triggers,
        status: PatientVerificationStatus.OTP_VERIFIED,
      },
    });

    // Store risk snapshot on the booking
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        verificationSnapshot: {
          score,
          tier,
          triggers,
          verificationId: verification.id,
        },
      },
    });

    await this.writeAuditLog(
      verification.id,
      'VERIFICATION_INITIATED',
      'SYSTEM',
      {
        score,
        tier,
        triggers,
        bookingId,
      },
    );

    // Auto-queue for manual review on CRITICAL
    if (tier === 'CRITICAL') {
      await this.queueManualReview(
        verification.id,
        ManualReviewReason.HIGH_RISK_SCORE,
        ReviewPriority.HIGH,
      );
    }

    return {
      verificationId: verification.id,
      riskScore: score,
      riskTier: tier,
      riskTriggers: triggers,
      requiredSteps: requiredSteps(tier),
    };
  }

  async getIdUploadUrl(
    patientUserId: string,
    verificationId: string,
    documentType: string,
    mimeType: string,
  ) {
    const verification = await this.findAndAuthorizeVerification(
      patientUserId,
      verificationId,
    );

    // Create a pending document record
    const doc = await this.prisma.patientIdDocument.create({
      data: {
        verificationId: verification.id,
        documentType,
        storagePath: `${verification.patientId}/${verification.id}/${documentType.toLowerCase()}-${Date.now()}`,
      },
    });

    const uploadUrl = await this.generateSignedUploadUrl(
      doc.storagePath,
      mimeType,
    );

    await this.prisma.patientVerification.update({
      where: { id: verificationId },
      data: { status: PatientVerificationStatus.ID_UPLOAD_PENDING },
    });

    await this.writeAuditLog(
      verificationId,
      'ID_UPLOAD_URL_GENERATED',
      patientUserId,
      { documentType, documentId: doc.id },
    );

    return { uploadUrl, documentId: doc.id, expiresIn: UPLOAD_URL_EXPIRY };
  }

  async confirmIdUpload(
    patientUserId: string,
    documentId: string,
    verificationId: string,
  ) {
    const verification = await this.findAndAuthorizeVerification(
      patientUserId,
      verificationId,
    );

    const doc = await this.prisma.patientIdDocument.findFirst({
      where: { id: documentId, verificationId },
    });
    if (!doc) throw new NotFoundException('Document record not found');

    // Phase 1: stub OCR — return mock extracted fields
    const mockOcr = {
      extractedName: 'Name Pending OCR',
      extractedDob: null,
      maskedIdNumber: 'XXXX XXXX 0000',
      confidence: 0.0,
      stub: true,
    };

    await this.prisma.patientIdDocument.update({
      where: { id: documentId },
      data: {
        ocrRawResult: mockOcr,
        extractedName: mockOcr.extractedName,
        extractedIdNumber: mockOcr.maskedIdNumber,
      },
    });

    await this.prisma.patientVerification.update({
      where: { id: verificationId },
      data: { status: PatientVerificationStatus.ID_UNDER_REVIEW },
    });

    await this.writeAuditLog(
      verificationId,
      'OCR_STUB_PROCESSED',
      patientUserId,
      { documentId },
    );

    // Queue for manual review since OCR is a stub
    await this.queueManualReview(
      verification.id,
      ManualReviewReason.OCR_MISMATCH,
      ReviewPriority.NORMAL,
    );

    return {
      ocrResult: mockOcr,
      status: 'ID_UNDER_REVIEW',
      nextStep: 'MANUAL_REVIEW',
    };
  }

  async getVerificationStatus(userId: string, bookingId: string, role: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { patient: true, provider: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const isPatient = booking.patient.userId === userId;
    const isProvider = booking.provider.userId === userId;
    if (!isPatient && !isProvider && role !== 'ADMIN')
      throw new ForbiddenException('Access denied');

    const verification = await this.prisma.patientVerification.findUnique({
      where: { patientId: booking.patientId },
    });

    if (!verification) {
      return {
        verificationId: null,
        status: 'NOT_STARTED',
        riskTier: null,
        completedSteps: [],
        pendingSteps: [],
      };
    }

    const steps = requiredSteps(verification.riskTier);
    return {
      verificationId: verification.id,
      status: verification.status,
      riskTier: verification.riskTier,
      riskScore: verification.riskScore,
      completedSteps: [] as string[],
      pendingSteps: steps,
    };
  }

  // ──────────────────────────────────────────────────
  // Admin-facing
  // ──────────────────────────────────────────────────

  async getReviewQueue(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.manualReviewQueue.findMany({
        where: { status: 'OPEN' },
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        include: {
          verification: {
            include: { patient: { select: { name: true } } },
          },
        },
      }),
      this.prisma.manualReviewQueue.count({ where: { status: 'OPEN' } }),
    ]);

    return {
      items: items.map((item) => ({
        reviewId: item.id,
        patientName: item.verification.patient.name,
        reason: item.reason,
        priority: item.priority,
        riskScore: item.verification.riskScore,
        createdAt: item.createdAt,
        status: item.status,
        verificationId: item.verificationId,
      })),
      total,
      page,
      limit,
    };
  }

  async approveVerification(
    adminId: string,
    verificationId: string,
    notes?: string,
  ) {
    const verification = await this.prisma.patientVerification.findUnique({
      where: { id: verificationId },
    });
    if (!verification) throw new NotFoundException('Verification not found');

    await this.prisma.$transaction([
      this.prisma.patientVerification.update({
        where: { id: verificationId },
        data: { status: PatientVerificationStatus.CONFIRMED },
      }),
      this.prisma.manualReviewQueue.updateMany({
        where: { verificationId, status: 'OPEN' },
        data: {
          status: 'APPROVED',
          resolvedAt: new Date(),
          assignedTo: adminId,
          notes: notes ?? null,
        },
      }),
    ]);

    await this.writeAuditLog(verificationId, 'MANUAL_APPROVED', adminId, {
      notes,
    });
    return { success: true, status: PatientVerificationStatus.CONFIRMED };
  }

  async rejectVerification(
    adminId: string,
    verificationId: string,
    reason: string,
    notifyPatient?: boolean,
  ) {
    const verification = await this.prisma.patientVerification.findUnique({
      where: { id: verificationId },
      include: { patient: { include: { user: { select: { phone: true } } } } },
    });
    if (!verification) throw new NotFoundException('Verification not found');

    await this.prisma.$transaction([
      this.prisma.patientVerification.update({
        where: { id: verificationId },
        data: { status: PatientVerificationStatus.FLAGGED },
      }),
      this.prisma.manualReviewQueue.updateMany({
        where: { verificationId, status: 'OPEN' },
        data: {
          status: 'REJECTED',
          resolvedAt: new Date(),
          assignedTo: adminId,
          notes: reason,
        },
      }),
    ]);

    if (notifyPatient && verification.patient.user?.phone) {
      await this.smsService.sendSms({
        to: verification.patient.user.phone,
        body: `Your Curex24 identity verification was not approved: ${reason}. Please contact support.`,
      });
    }

    await this.writeAuditLog(verificationId, 'MANUAL_REJECTED', adminId, {
      reason,
      notifyPatient,
    });
    return { success: true, status: PatientVerificationStatus.FLAGGED };
  }

  async emergencyOverride(
    adminId: string,
    verificationId: string,
    reason: string,
  ) {
    if (!reason?.trim())
      throw new BadRequestException('Override reason is required');

    const verification = await this.prisma.patientVerification.findUnique({
      where: { id: verificationId },
    });
    if (!verification) throw new NotFoundException('Verification not found');

    await this.prisma.patientVerification.update({
      where: { id: verificationId },
      data: {
        status: PatientVerificationStatus.EMERGENCY_OVERRIDE,
        emergencyOverride: true,
        overrideReason: reason,
        overrideBy: adminId,
        overrideAt: new Date(),
      },
    });

    await this.writeAuditLog(
      verificationId,
      'EMERGENCY_OVERRIDE_APPLIED',
      adminId,
      { reason },
    );
    return {
      success: true,
      status: PatientVerificationStatus.EMERGENCY_OVERRIDE,
    };
  }

  async getAuditLogs(
    verificationId?: string,
    patientId?: string,
    page = 1,
    limit = 50,
  ) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

    if (verificationId) where['verificationId'] = verificationId;
    if (patientId) {
      const v = await this.prisma.patientVerification.findFirst({
        where: { patientId },
        select: { id: true },
      });
      if (v) where['verificationId'] = v.id;
    }

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.verificationAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.verificationAuditLog.count({ where }),
    ]);

    return { logs, total, page, limit };
  }

  async getVerificationDetail(verificationId: string) {
    const verification = await this.prisma.patientVerification.findUnique({
      where: { id: verificationId },
      include: {
        patient: { select: { name: true, userId: true } },
        idDocuments: true,
        verificationAuditLogs: { orderBy: { createdAt: 'desc' } },
        manualReviewQueues: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!verification) throw new NotFoundException('Verification not found');
    return verification;
  }

  // ──────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────

  private async findAndAuthorizeVerification(
    patientUserId: string,
    verificationId: string,
  ) {
    const verification = await this.prisma.patientVerification.findUnique({
      where: { id: verificationId },
      include: { patient: { select: { userId: true } } },
    });
    if (!verification) throw new NotFoundException('Verification not found');
    if (verification.patient.userId !== patientUserId)
      throw new ForbiddenException('Not your verification');
    return verification;
  }

  private async queueManualReview(
    verificationId: string,
    reason: ManualReviewReason,
    priority: ReviewPriority,
  ) {
    const existing = await this.prisma.manualReviewQueue.findFirst({
      where: { verificationId, status: 'OPEN', reason },
    });
    if (existing) return existing;

    return this.prisma.manualReviewQueue.create({
      data: { verificationId, reason, priority },
    });
  }

  private async writeAuditLog(
    verificationId: string,
    action: string,
    performedBy: string,
    meta?: Record<string, unknown>,
  ) {
    await this.prisma.verificationAuditLog.create({
      data: {
        verificationId,
        action,
        performedBy,
        meta: meta as Prisma.InputJsonValue | undefined,
      },
    });
  }

  private async generateSignedUploadUrl(
    storagePath: string,
    _mimeType: string,
  ): Promise<string> {
    if (!this.supabaseUrl || !this.supabaseKey) {
      this.logger.warn('Supabase not configured — returning mock upload URL');
      return `https://mock-supabase.example.com/${ID_DOCS_BUCKET}/${storagePath}?mock=true`;
    }

    const url = `${this.supabaseUrl}/storage/v1/object/sign/${ID_DOCS_BUCKET}/${storagePath}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: UPLOAD_URL_EXPIRY }),
    });

    if (!resp.ok) {
      throw new Error(
        `Failed to generate Supabase upload URL: ${resp.statusText}`,
      );
    }

    const data = (await resp.json()) as { signedURL: string };
    return `${this.supabaseUrl}/storage/v1${data.signedURL}`;
  }
}

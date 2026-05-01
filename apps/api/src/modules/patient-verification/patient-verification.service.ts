import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RiskEngineService } from './risk-engine.service';
import { SmsService } from '../sms/sms.service';
import { ConfigService } from '@nestjs/config';
import { KycMlClient, KycMlError, mapKycMlErrorStatus } from './kyc-ml.client';
import { SurepassEaadhaarProvider } from './providers/surepass-eaadhaar.provider';
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
 * Wizard step keys returned by `getMyVerificationStatus` for the
 * profile-launched self-serve KYC flow. Order is intentional — the first
 * non-completed step is treated as the "next" step by the mobile UI.
 *
 * `ID_UPLOAD` is intentionally first so that when the patient uploads their
 * Aadhaar, the OCR-extracted name/DOB/gender/address can pre-fill the
 * Personal Details and Address screens.
 */
const SELF_SERVE_STEPS = [
  'ID_UPLOAD',
  'PERSONAL_DETAILS',
  'ADDRESS',
  'FACE_CAPTURE',
  'GUARDIAN', // included only when isMinor === true
  'REVIEW',
] as const;
type SelfServeStep = (typeof SELF_SERVE_STEPS)[number];

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
    private readonly kycMl: KycMlClient,
    private readonly surepassEaadhaar: SurepassEaadhaarProvider,
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

  async getMyVerificationStatus(userId: string) {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });

    if (!patient) {
      return {
        verificationId: null,
        status: 'NOT_STARTED',
        riskTier: null,
        riskScore: null,
        isMinor: false,
        completedSteps: [] as string[],
        pendingSteps: [...SELF_SERVE_STEPS] as string[],
        nextStep: SELF_SERVE_STEPS[0] as string,
        personalDetails: null,
        address: null,
        idDocument: null,
        faceCapture: null,
        aadhaarLast4: null,
        guardian: null,
      };
    }

    const verification = await this.prisma.patientVerification.findUnique({
      where: { patientId: patient.id },
      include: {
        idDocuments: { orderBy: { uploadedAt: 'desc' } },
      },
    });

    if (!verification) {
      return {
        verificationId: null,
        status: 'NOT_STARTED',
        riskTier: null,
        riskScore: null,
        isMinor: false,
        completedSteps: [] as string[],
        pendingSteps: [...SELF_SERVE_STEPS] as string[],
        nextStep: SELF_SERVE_STEPS[0] as string,
        personalDetails: null,
        address: null,
        idDocument: null,
        faceCapture: null,
        aadhaarLast4: null,
        guardian: null,
      };
    }

    const completed = this.computeCompletedSelfServeSteps(verification);
    const pending = this.computePendingSelfServeSteps(
      verification.isMinor,
      completed,
    );

    return {
      verificationId: verification.id,
      status: verification.status,
      riskTier: verification.riskTier,
      riskScore: verification.riskScore,
      isMinor: verification.isMinor,
      completedSteps: completed,
      pendingSteps: pending,
      nextStep: pending[0] ?? null,
      personalDetails: verification.fullName
        ? {
            fullName: verification.fullName,
            dateOfBirth: verification.dateOfBirth,
            gender: verification.gender,
          }
        : null,
      address:
        verification.addressLine || verification.addressLat != null
          ? {
              source: verification.addressSource,
              addressLine: verification.addressLine,
              city: verification.city,
              state: verification.state,
              pincode: verification.pincode,
              lat: verification.addressLat,
              lng: verification.addressLng,
            }
          : null,
      idDocument: verification.idDocuments[0]
        ? {
            documentId: verification.idDocuments[0].id,
            documentType: verification.idDocuments[0].documentType,
            extractedName: verification.idDocuments[0].extractedName,
            extractedIdNumber: verification.idDocuments[0].extractedIdNumber,
            ocrMatchPassed: verification.ocrMatchPassed,
          }
        : null,
      faceCapture:
        verification.selfieStoragePath || verification.identityVerifiedAt
          ? {
              captured: true,
              faceMatchPassed: verification.faceMatchPassed,
              faceMatchScore: verification.faceMatchScore,
              identityVerifiedAt: verification.identityVerifiedAt ?? null,
            }
          : null,
      aadhaarLast4: verification.aadhaarLast4 ?? null,
      guardian: verification.guardianName
        ? {
            guardianName: verification.guardianName,
            relationship: verification.guardianRelationship,
            guardianPhone: verification.guardianPhone,
            guardianAadhaarLast4: verification.guardianAadhaarLast4,
          }
        : null,
      submittedAt: verification.submittedAt,
      autoApprovedAt: verification.autoApprovedAt,
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
  // Self-serve KYC (profile-launched wizard)
  // ──────────────────────────────────────────────────

  /**
   * Create or fetch the patient's verification record without requiring a
   * booking. Idempotent — returns the existing row if one already exists.
   */
  async selfStart(userId: string) {
    // The wizard collects all identity fields itself (name, DOB, gender,
    // address, ID, face), so we don't require a pre-existing PatientProfile
    // here — we lazily create a minimal one if missing. This prevents a
    // dead-end "Please complete your profile first." error for users who
    // signed up but never went through the onboarding form.
    const patient = await this.ensurePatientProfileForUser(userId);

    const verification = await this.prisma.patientVerification.upsert({
      where: { patientId: patient.id },
      update: {},
      create: {
        patientId: patient.id,
        riskScore: 0,
        riskTier: 'LOW',
        riskTriggers: [],
        status: PatientVerificationStatus.OTP_VERIFIED,
      },
    });

    await this.writeAuditLog(
      verification.id,
      'SELF_VERIFICATION_STARTED',
      userId,
      {},
    );

    return this.getMyVerificationStatus(userId);
  }

  async selfSubmitPersonalDetails(
    userId: string,
    dto: {
      fullName: string;
      dateOfBirth: string;
      gender: string;
    },
  ) {
    const verification = await this.getOrCreateForUser(userId);
    const dob = new Date(dto.dateOfBirth);
    if (Number.isNaN(dob.getTime()) || dob > new Date()) {
      throw new BadRequestException('Invalid date of birth');
    }

    const isMinor = this.computeIsMinor(dob);

    await this.prisma.patientVerification.update({
      where: { id: verification.id },
      data: {
        fullName: dto.fullName.trim(),
        dateOfBirth: dob,
        gender: dto.gender,
        isMinor,
        status: PatientVerificationStatus.PROFILE_COMPLETE,
      },
    });

    await this.writeAuditLog(
      verification.id,
      'SELF_PERSONAL_DETAILS_SUBMITTED',
      userId,
      { isMinor },
    );

    return this.getMyVerificationStatus(userId);
  }

  async selfSubmitAddress(
    userId: string,
    dto: {
      source: 'MANUAL' | 'MAP';
      addressLine?: string;
      city?: string;
      state?: string;
      pincode?: string;
      lat?: number;
      lng?: number;
      formatted?: string;
    },
  ) {
    const verification = await this.getOrCreateForUser(userId);

    const manualOk =
      dto.source === 'MANUAL' &&
      !!dto.addressLine?.trim() &&
      !!dto.city?.trim() &&
      !!dto.state?.trim() &&
      !!dto.pincode?.trim();
    const mapOk =
      dto.source === 'MAP' &&
      typeof dto.lat === 'number' &&
      typeof dto.lng === 'number';
    if (!manualOk && !mapOk) {
      throw new BadRequestException(
        'Either a complete manual address or map coordinates are required.',
      );
    }

    await this.prisma.patientVerification.update({
      where: { id: verification.id },
      data: {
        addressSource: dto.source,
        addressLine:
          dto.source === 'MAP'
            ? (dto.formatted ?? null)
            : (dto.addressLine ?? null),
        city: dto.city ?? null,
        state: dto.state ?? null,
        pincode: dto.pincode ?? null,
        addressLat: dto.lat ?? null,
        addressLng: dto.lng ?? null,
      },
    });

    await this.writeAuditLog(
      verification.id,
      'SELF_ADDRESS_SUBMITTED',
      userId,
      { source: dto.source },
    );

    return this.getMyVerificationStatus(userId);
  }

  async selfGetIdUploadUrl(
    userId: string,
    documentType: string,
    mimeType: string,
  ) {
    const verification = await this.getOrCreateForUser(userId);

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
      where: { id: verification.id },
      data: { status: PatientVerificationStatus.ID_UPLOAD_PENDING },
    });

    await this.writeAuditLog(
      verification.id,
      'SELF_ID_UPLOAD_URL_GENERATED',
      userId,
      { documentType, documentId: doc.id },
    );

    return { uploadUrl, documentId: doc.id, expiresIn: UPLOAD_URL_EXPIRY };
  }

  /**
   * Mock OCR confirmation: always succeeds and reports a match against the
   * patient's `fullName` if available. No third-party provider is called.
   * Returning success keeps the staging flow unblocked while the real OCR
   * pipeline is being built.
   */
  async selfConfirmIdUpload(userId: string, documentId: string) {
    const verification = await this.getOrCreateForUser(userId);

    const doc = await this.prisma.patientIdDocument.findFirst({
      where: { id: documentId, verificationId: verification.id },
    });
    if (!doc) throw new NotFoundException('Document record not found');

    const mockOcr = {
      extractedName: verification.fullName ?? 'Mock Patient Name',
      extractedDob: verification.dateOfBirth
        ? verification.dateOfBirth.toISOString().slice(0, 10)
        : null,
      maskedIdNumber: 'XXXX XXXX 0000',
      confidence: 0.95,
      provider: 'mock',
      stub: true,
    };

    await this.prisma.patientIdDocument.update({
      where: { id: documentId },
      data: {
        ocrRawResult: mockOcr,
        extractedName: mockOcr.extractedName,
        extractedIdNumber: mockOcr.maskedIdNumber,
        extractedDob: mockOcr.extractedDob,
      },
    });

    await this.prisma.patientVerification.update({
      where: { id: verification.id },
      data: {
        ocrMatchPassed: true,
        ocrConfidenceScore: mockOcr.confidence,
        idType: doc.documentType,
        status: PatientVerificationStatus.ID_VERIFIED,
      },
    });

    await this.writeAuditLog(
      verification.id,
      'SELF_OCR_MOCK_PROCESSED',
      userId,
      { documentId, match: true },
    );

    return { ocrResult: mockOcr, ocrMatchPassed: true };
  }

  /**
   * Mock face/Aadhaar match: always returns success. The actual selfie file
   * upload is handled the same way as the ID document (signed URL → PUT) but
   * is kept simple here — we just persist the storagePath placeholder so the
   * UI can show "selfie captured ✓" on the review screen.
   */
  async selfSubmitFace(
    userId: string,
    dto: { mimeType: string; qualityHint?: string },
  ) {
    const verification = await this.getOrCreateForUser(userId);

    const storagePath = `${verification.patientId}/${verification.id}/selfie-${Date.now()}`;
    const uploadUrl = await this.generateSignedUploadUrl(
      storagePath,
      dto.mimeType,
    );

    await this.prisma.patientVerification.update({
      where: { id: verification.id },
      data: {
        selfieStoragePath: storagePath,
        faceMatchPassed: true,
        faceMatchScore: 0.92,
      },
    });

    await this.writeAuditLog(
      verification.id,
      'SELF_FACE_MOCK_VERIFIED',
      userId,
      { qualityHint: dto.qualityHint, match: true },
    );

    return {
      uploadUrl,
      storagePath,
      faceMatchPassed: true,
      faceMatchScore: 0.92,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // ML-backed Aadhaar OCR + face match (delegates to apps/kyc-ml).
  //
  // These two methods are the **production** path. They are only invoked by
  // the new multipart endpoints on the controller — the older JSON endpoints
  // above (`selfConfirmIdUpload`, `selfSubmitFace`) keep their mock behaviour
  // for backward compatibility and for environments where the Python sidecar
  // is not deployed (`KYC_ML_ENABLED=false`).
  // ──────────────────────────────────────────────────────────────────

  /**
   * Upload an Aadhaar image to the Python sidecar, persist the extracted
   * fields onto the verification record, and return the same data to the
   * mobile client so it can pre-fill the Personal Details and Address screens.
   *
   * Privacy invariants:
   *  - Only the last 4 digits of the Aadhaar number are persisted.
   *  - The cropped Aadhaar face lives in the private `verify_faces` Supabase
   *    bucket and is removed by the sidecar after the face-match step runs.
   */
  async selfProcessAadhaar(
    userId: string,
    file: { buffer: Buffer; mimetype: string; originalname?: string },
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No Aadhaar image was uploaded.');
    }
    if (!this.kycMl.isEnabled()) {
      throw new BadRequestException(
        'Aadhaar OCR is not enabled in this environment. Please use the manual entry flow.',
      );
    }

    const verification = await this.getOrCreateForUser(userId);

    let extraction;
    try {
      extraction = await this.kycMl.processAadhaar({
        userId,
        fileBuffer: file.buffer,
        mimeType: file.mimetype,
        filename: file.originalname,
      });
    } catch (err) {
      if (err instanceof KycMlError) {
        await this.writeAuditLog(
          verification.id,
          'KYC_ML_AADHAAR_FAILED',
          userId,
          { code: err.code },
        );
        // Re-raise with the mapped HTTP status so the mobile client sees
        // both the status code and the structured `{ code, message }` body.
        throw new HttpException(
          { code: err.code, message: err.message },
          mapKycMlErrorStatus(err.code),
        );
      }
      throw err;
    }

    // Persist the extracted fields. Note: every field stays editable on
    // the next screens — we just pre-fill so the patient does not retype.
    const dob = extraction.dob ? new Date(extraction.dob) : null;
    const isMinor = dob ? this.computeIsMinor(dob) : verification.isMinor;
    await this.prisma.patientVerification.update({
      where: { id: verification.id },
      data: {
        fullName: extraction.full_name ?? verification.fullName ?? null,
        dateOfBirth: dob ?? verification.dateOfBirth ?? null,
        gender: extraction.gender ?? verification.gender ?? null,
        addressLine: extraction.address ?? verification.addressLine ?? null,
        aadhaarLast4: extraction.aadhaar_last4 ?? null,
        aadhaarFaceStoragePath: extraction.storage_path ?? null,
        idType: 'AADHAAR_FRONT',
        idVerificationSource: 'KYC_ML',
        ocrConfidenceScore: 0.95,
        ocrMatchPassed: true,
        isMinor,
        status: PatientVerificationStatus.PROFILE_COMPLETE,
      },
    });

    // Track an associated PatientIdDocument row for audit / admin review.
    // The OCR free-text is **not** stored here — only structured fields.
    await this.prisma.patientIdDocument.create({
      data: {
        verificationId: verification.id,
        documentType: 'AADHAAR_FRONT',
        storagePath: extraction.storage_path ?? '',
        extractedName: extraction.full_name,
        extractedDob: extraction.dob,
        extractedIdNumber: extraction.aadhaar_last4
          ? `XXXX XXXX ${extraction.aadhaar_last4}`
          : null,
        ocrRawResult: {
          source: 'kyc-ml',
          aadhaar_last4: extraction.aadhaar_last4,
        },
      },
    });

    await this.writeAuditLog(verification.id, 'KYC_ML_OCR_PROCESSED', userId, {
      face_stored: extraction.face_stored,
      has_name: !!extraction.full_name,
      has_dob: !!extraction.dob,
      has_address: !!extraction.address,
      // Never log the full OCR text — it could contain the full Aadhaar.
    });

    return {
      fullName: extraction.full_name,
      dob: extraction.dob,
      gender: extraction.gender,
      address: extraction.address,
      aadhaarLast4: extraction.aadhaar_last4,
      faceStored: extraction.face_stored,
      isMinor,
    };
  }

  /**
   * Upload an eAadhaar PDF to Surepass for validation + field extraction.
   *
   * This is the preferred Aadhaar verification path when
   * `SUREPASS_EAADHAAR_ENABLED=true`. The extracted personal details
   * (name, DOB, gender, address, pincode, state) are persisted onto the
   * PatientVerification row so the next wizard screens can be pre-filled.
   * The full Surepass response is stored as `surepassEaadhaarRaw` for audit.
   *
   * When the live Surepass service is not configured (dev / CI) the provider
   * falls back to a deterministic mock so the wizard flow remains testable.
   */
  async selfProcessEaadhaar(
    userId: string,
    file: { buffer: Buffer; mimetype: string; originalname?: string },
    password?: string,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No eAadhaar PDF was uploaded.');
    }
    if (
      file.mimetype !== 'application/pdf' &&
      !file.mimetype.startsWith('application/')
    ) {
      throw new BadRequestException(
        'Please upload the eAadhaar as a PDF file.',
      );
    }

    const verification = await this.getOrCreateForUser(userId);

    const result = await this.surepassEaadhaar.processEaadhaar(
      file.buffer,
      password?.trim() || undefined,
    );

    if (!result.valid) {
      await this.writeAuditLog(
        verification.id,
        'SUREPASS_EAADHAAR_INVALID',
        userId,
        { rawStatus: result.rawResponse?.['status_code'] },
      );
      throw new BadRequestException(
        'The uploaded eAadhaar could not be validated. Please ensure you are uploading a valid eAadhaar PDF and that the password (if any) is correct.',
      );
    }

    // Convert Surepass DOB (DD-MM-YYYY or DD/MM/YYYY) to ISO YYYY-MM-DD.
    // Guard against malformed values by validating each part.
    let dobIso: string | null = null;
    if (result.dob) {
      const parts = result.dob.split(/[-/]/);
      if (parts.length === 3) {
        const [rawD, rawM, rawY] = parts;
        const d = (rawD ?? '').trim();
        const m = (rawM ?? '').trim();
        const y = (rawY ?? '').trim();
        // All three parts must be non-empty strings of digits
        if (/^\d+$/.test(d) && /^\d+$/.test(m) && /^\d{4}$/.test(y)) {
          dobIso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          // Reject if the resulting date is not calendar-valid
          const testDate = new Date(dobIso);
          if (
            Number.isNaN(testDate.getTime()) ||
            testDate.getFullYear() !== Number(y) ||
            testDate.getMonth() + 1 !== Number(m) ||
            testDate.getDate() !== Number(d)
          ) {
            this.logger.warn(
              `[surepass-eaadhaar] Ignoring invalid DOB from response: ${result.dob}`,
            );
            dobIso = null;
          }
        }
      }
    }

    const dobDate = dobIso ? new Date(dobIso) : null;
    const isMinor = dobDate
      ? this.computeIsMinor(dobDate)
      : verification.isMinor;

    // Map Surepass gender ('M' / 'F' / 'MALE' / 'FEMALE' etc.) to enum value
    const normalizeGender = (g?: string): string | null => {
      if (!g) return null;
      const u = g.toUpperCase();
      if (u === 'M' || u === 'MALE') return 'MALE';
      if (u === 'F' || u === 'FEMALE') return 'FEMALE';
      return 'OTHER';
    };

    const now = new Date();

    await this.prisma.patientVerification.update({
      where: { id: verification.id },
      data: {
        fullName: result.name ?? verification.fullName ?? null,
        dateOfBirth: dobDate ?? verification.dateOfBirth ?? null,
        gender: normalizeGender(result.gender) ?? verification.gender ?? null,
        addressLine: result.address ?? verification.addressLine ?? null,
        city: result.district ?? verification.city ?? null,
        state: result.state ?? verification.state ?? null,
        pincode: result.zip ?? verification.pincode ?? null,
        aadhaarLast4: result.aadhaarLast4 ?? null,
        idType: 'EAADHAAR',
        idVerificationSource: this.surepassEaadhaar.isEnabled()
          ? 'SUREPASS'
          : 'SUREPASS_MOCK',
        ocrMatchPassed: true,
        ocrConfidenceScore: 1.0,
        isMinor,
        surepassEaadhaarRaw: result.rawResponse
          ? (result.rawResponse as Prisma.InputJsonValue)
          : null,
        eAadhaarValidatedAt: now,
        status: PatientVerificationStatus.PROFILE_COMPLETE,
      },
    });

    // Create associated PatientIdDocument record for admin review
    await this.prisma.patientIdDocument.create({
      data: {
        verificationId: verification.id,
        documentType: 'EAADHAAR',
        storagePath: '',
        extractedName: result.name,
        extractedDob: dobIso,
        extractedIdNumber: result.aadhaarLast4
          ? `XXXX XXXX ${result.aadhaarLast4}`
          : null,
        ocrRawResult: {
          source: this.surepassEaadhaar.isEnabled()
            ? 'surepass'
            : 'surepass-mock',
          aadhaar_last4: result.aadhaarLast4,
          validated_at: now.toISOString(),
        },
      },
    });

    await this.writeAuditLog(
      verification.id,
      'SUREPASS_EAADHAAR_VALIDATED',
      userId,
      {
        has_name: !!result.name,
        has_dob: !!result.dob,
        has_address: !!result.address,
        mock: !this.surepassEaadhaar.isEnabled(),
      },
    );

    return {
      fullName: result.name ?? null,
      dob: dobIso,
      gender: normalizeGender(result.gender),
      address: result.address ?? null,
      city: result.district ?? null,
      state: result.state ?? null,
      pincode: result.zip ?? null,
      aadhaarLast4: result.aadhaarLast4 ?? null,
      isMinor,
    };
  }

  /**
   * Upload a live selfie to the Python sidecar to be matched against the
   * Aadhaar face stored during `selfProcessAadhaar`. On success we mark
   * the verification as ID-verified and stamp `identityVerifiedAt`.
   *
   * The sidecar always cleans up the cropped Aadhaar face after this call
   * (success or fail). We mirror that into our own audit log.
   */
  async selfFaceMatch(
    userId: string,
    file: { buffer: Buffer; mimetype: string; originalname?: string },
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No selfie image was uploaded.');
    }
    if (!this.kycMl.isEnabled()) {
      throw new BadRequestException(
        'Face verification is not enabled in this environment.',
      );
    }

    const verification = await this.getOrCreateForUser(userId);

    let result;
    try {
      result = await this.kycMl.verifyPatientIdentity({
        userId,
        fileBuffer: file.buffer,
        mimeType: file.mimetype,
        filename: file.originalname,
      });
    } catch (err) {
      if (err instanceof KycMlError) {
        await this.writeAuditLog(
          verification.id,
          err.code === 'LOW_CONFIDENCE'
            ? 'KYC_ML_FACE_REJECTED'
            : 'KYC_ML_FACE_FAILED',
          userId,
          { code: err.code },
        );
        // Even on failure the sidecar cleared the stored face. Reflect that.
        await this.prisma.patientVerification.update({
          where: { id: verification.id },
          data: {
            aadhaarFaceStoragePath: null,
            faceMatchPassed: false,
          },
        });
        await this.writeAuditLog(
          verification.id,
          'KYC_ML_AADHAAR_FACE_CLEANED',
          userId,
          { reason: err.code },
        );
        throw new HttpException(
          { code: err.code, message: err.message },
          mapKycMlErrorStatus(err.code),
        );
      }
      throw err;
    }

    await this.prisma.patientVerification.update({
      where: { id: verification.id },
      data: {
        faceMatchPassed: result.matched,
        faceMatchScore: result.similarity,
        aadhaarFaceStoragePath: null, // sidecar deleted the object
        identityVerifiedAt: result.matched ? new Date() : null,
        idVerifiedAt: result.matched ? new Date() : null,
        status: result.matched
          ? PatientVerificationStatus.ID_VERIFIED
          : verification.status,
      },
    });

    await this.writeAuditLog(
      verification.id,
      result.matched ? 'KYC_ML_FACE_MATCHED' : 'KYC_ML_FACE_REJECTED',
      userId,
      {
        distance: result.distance,
        similarity: result.similarity,
        threshold: result.threshold,
      },
    );
    await this.writeAuditLog(
      verification.id,
      'KYC_ML_AADHAAR_FACE_CLEANED',
      userId,
      { reason: result.matched ? 'matched' : 'mismatched' },
    );

    return {
      matched: result.matched,
      similarity: result.similarity,
      distance: result.distance,
      threshold: result.threshold,
    };
  }

  async selfSubmitGuardian(
    userId: string,
    dto: {
      guardianName: string;
      relationship: string;
      guardianPhone: string;
      guardianAadhaarLast4: string;
    },
  ) {
    const verification = await this.getOrCreateForUser(userId);

    if (!verification.isMinor) {
      throw new BadRequestException(
        'Guardian details are only required for minors (<18).',
      );
    }

    await this.prisma.patientVerification.update({
      where: { id: verification.id },
      data: {
        guardianName: dto.guardianName.trim(),
        guardianRelationship: dto.relationship.trim(),
        guardianPhone: dto.guardianPhone.trim(),
        guardianAadhaarLast4: dto.guardianAadhaarLast4,
      },
    });

    await this.writeAuditLog(
      verification.id,
      'SELF_GUARDIAN_SUBMITTED',
      userId,
      {},
    );

    return this.getMyVerificationStatus(userId);
  }

  /**
   * Finalize the wizard. With the mock OCR/face pipeline this auto-approves
   * to `CONFIRMED` whenever all required wizard steps are complete (and, for
   * minors, guardian details are present). When mandatory verification is
   * later switched on we can tighten this rule without changing the UI.
   */
  async selfSubmitForApproval(userId: string) {
    const verification = await this.getOrCreateForUser(userId);
    const completed = this.computeCompletedSelfServeSteps(verification);
    const pending = this.computePendingSelfServeSteps(
      verification.isMinor,
      completed,
    ).filter((s) => s !== 'REVIEW');

    if (pending.length > 0) {
      throw new BadRequestException(
        `Please complete these steps before submitting: ${pending.join(', ')}`,
      );
    }

    const now = new Date();
    await this.prisma.patientVerification.update({
      where: { id: verification.id },
      data: {
        submittedAt: now,
        autoApprovedAt: now,
        idVerifiedAt: now,
        idVerificationSource: 'SELF_SERVE_MOCK',
        status: PatientVerificationStatus.CONFIRMED,
      },
    });

    await this.writeAuditLog(verification.id, 'SELF_AUTO_APPROVED', userId, {
      mock: true,
    });

    return this.getMyVerificationStatus(userId);
  }

  /**
   * True when the patient has a CONFIRMED or EMERGENCY_OVERRIDE verification.
   * Used by the booking-creation gate.
   */
  async isPatientVerified(patientProfileId: string): Promise<boolean> {
    const v = await this.prisma.patientVerification.findUnique({
      where: { patientId: patientProfileId },
      select: { status: true },
    });
    if (!v) return false;
    return (
      v.status === PatientVerificationStatus.CONFIRMED ||
      v.status === PatientVerificationStatus.EMERGENCY_OVERRIDE
    );
  }

  // ──────────────────────────────────────────────────

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

  private computeIsMinor(dob: Date): boolean {
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
      age--;
    }
    return age < 18;
  }

  private async getOrCreateForUser(userId: string) {
    const patient = await this.ensurePatientProfileForUser(userId);

    return this.prisma.patientVerification.upsert({
      where: { patientId: patient.id },
      update: {},
      create: {
        patientId: patient.id,
        riskScore: 0,
        riskTier: 'LOW',
        riskTriggers: [],
        status: PatientVerificationStatus.OTP_VERIFIED,
      },
      include: { idDocuments: true },
    });
  }

  /**
   * Returns the patient's `PatientProfile`, creating a minimal placeholder
   * record if one does not yet exist. Used by the self-serve KYC wizard so
   * patients who signed up but never completed the standalone profile form
   * can still start identity verification — the wizard collects name/DOB
   * itself and patches the placeholder via `selfSubmitPersonalDetails`.
   *
   * Throws `NotFoundException` only when the underlying `User` row is
   * missing (which would indicate an authentication problem, not a
   * profile-completion one).
   */
  private async ensurePatientProfileForUser(userId: string) {
    const existing = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });
    if (existing) return existing;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.patientProfile.create({
      data: {
        // `name` is required on PatientProfile; leave empty so the wizard's
        // Personal Details step can populate it. The mobile UI treats an
        // empty name as "incomplete" and prompts accordingly.
        name: '',
        user: { connect: { id: userId } },
      },
    });
  }

  private computeCompletedSelfServeSteps(verification: {
    fullName: string | null;
    addressLine: string | null;
    addressLat: number | null;
    selfieStoragePath: string | null;
    guardianName: string | null;
    isMinor: boolean;
    status: PatientVerificationStatus;
    idDocuments?: Array<{ extractedName: string | null }>;
    aadhaarLast4?: string | null;
    identityVerifiedAt?: Date | null;
  }): SelfServeStep[] {
    const completed: SelfServeStep[] = [];
    if (verification.fullName) completed.push('PERSONAL_DETAILS');
    if (verification.addressLine || verification.addressLat != null)
      completed.push('ADDRESS');
    // ID_UPLOAD is complete when either the legacy mock OCR ran (any
    // PatientIdDocument with an extracted name) OR the new ML pipeline ran
    // (aadhaarLast4 populated on the verification row).
    if (
      (verification.idDocuments &&
        verification.idDocuments.some((d) => d.extractedName)) ||
      verification.aadhaarLast4
    ) {
      completed.push('ID_UPLOAD');
    }
    // FACE_CAPTURE is complete when either a selfie was uploaded (legacy
    // mock) OR the ML pipeline confirmed identity.
    if (verification.selfieStoragePath || verification.identityVerifiedAt)
      completed.push('FACE_CAPTURE');
    if (verification.isMinor && verification.guardianName)
      completed.push('GUARDIAN');
    if (
      verification.status === PatientVerificationStatus.CONFIRMED ||
      verification.status === PatientVerificationStatus.EMERGENCY_OVERRIDE
    ) {
      completed.push('REVIEW');
    }
    return completed;
  }

  private computePendingSelfServeSteps(
    isMinor: boolean,
    completed: SelfServeStep[],
  ): SelfServeStep[] {
    const all: SelfServeStep[] = isMinor
      ? [
          'ID_UPLOAD',
          'PERSONAL_DETAILS',
          'ADDRESS',
          'FACE_CAPTURE',
          'GUARDIAN',
          'REVIEW',
        ]
      : ['ID_UPLOAD', 'PERSONAL_DETAILS', 'ADDRESS', 'FACE_CAPTURE', 'REVIEW'];
    return all.filter((s) => !completed.includes(s));
  }

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

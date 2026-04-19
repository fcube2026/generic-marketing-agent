import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  PrescriptionStatus,
  PrescriptionReviewAction,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PrescriptionStorageService } from './prescription-storage.service';
import { VerifyAction } from './dto/verify-prescription.dto';

/** Allowed MIME types for prescription uploads. */
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

/** Maximum allowed file size: 10 MB. */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** SLA target for prescription review (milliseconds). */
const SLA_TARGET_MS = 15 * 60 * 1000;

/** Statuses that indicate a prescription has already been processed. */
const TERMINAL_STATUSES: PrescriptionStatus[] = [
  PrescriptionStatus.APPROVED,
  PrescriptionStatus.REJECTED,
];

type UploadedPrescriptionWithUser = Prisma.UploadedPrescriptionGetPayload<{
  include: { user: { select: { id: true; phone: true; email: true } } };
}>;

@Injectable()
export class PrescriptionService {
  private readonly logger = new Logger(PrescriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: PrescriptionStorageService,
  ) {}

  // ---------------------------------------------------------------------------
  // Patient-facing operations
  // ---------------------------------------------------------------------------

  /**
   * Validate the uploaded file and store it in Supabase Storage.
   * Creates a new UploadedPrescription record with PENDING_REVIEW status.
   *
   * @param userId  Authenticated patient's user ID.
   * @param file    Multer file object from the request.
   * @returns The newly created prescription ID.
   */
  async handleUpload(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ prescriptionId: string }> {
    this.logger.log('Prescription upload attempt', { userId });

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      this.logger.warn('Invalid file type rejected', {
        userId,
        mimetype: file.mimetype,
      });
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, and PDF are accepted.',
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.logger.warn('File size limit exceeded', {
        userId,
        size: file.size,
      });
      throw new BadRequestException('File size exceeds the 10 MB limit.');
    }

    // Create the DB record first so Prisma assigns a cuid (consistent with
    // all other models). A placeholder path is used until the upload succeeds.
    const prescription = await this.prisma.uploadedPrescription.create({
      data: {
        userId,
        filePath: '',
        status: PrescriptionStatus.PENDING_REVIEW,
      },
    });

    // Upload to Supabase Storage using the DB-generated ID as the path component.
    let filePath: string;
    try {
      filePath = await this.storage.uploadFile(
        userId,
        prescription.id,
        file.buffer,
        file.mimetype,
      );
    } catch (err) {
      // Clean up the dangling DB record on storage failure.
      await this.prisma.uploadedPrescription
        .delete({ where: { id: prescription.id } })
        .catch(() => undefined);
      throw err;
    }

    // Update the record with the real storage path.
    await this.prisma.uploadedPrescription.update({
      where: { id: prescription.id },
      data: { filePath },
    });

    this.logger.log('Prescription uploaded successfully', {
      userId,
      prescriptionId: prescription.id,
    });

    return { prescriptionId: prescription.id };
  }

  // ---------------------------------------------------------------------------
  // Admin / pharmacist operations
  // ---------------------------------------------------------------------------

  /**
   * Return all prescriptions with PENDING_REVIEW status for the admin queue.
   * Supports pagination and sorting.
   */
  async getQueue(
    page = 1,
    limit = 20,
    sortBy: 'createdAt' | 'updatedAt' = 'createdAt',
    order: 'asc' | 'desc' = 'asc',
  ) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.uploadedPrescription.findMany({
        where: { status: PrescriptionStatus.PENDING_REVIEW },
        include: {
          user: { select: { id: true, phone: true, email: true } },
        },
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
      }),
      this.prisma.uploadedPrescription.count({
        where: { status: PrescriptionStatus.PENDING_REVIEW },
      }),
    ]);

    const now = Date.now();

    // Annotate items with SLA information
    const annotated = items.map((rx) => {
      const ageMs = now - rx.createdAt.getTime();
      return {
        ...rx,
        sla: {
          targetMs: SLA_TARGET_MS,
          elapsedMs: ageMs,
          breached: ageMs > SLA_TARGET_MS,
        },
      };
    });

    return {
      data: annotated,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Fetch a single prescription by ID and generate a short-lived signed URL
   * for secure file access. Only admins may call this.
   */
  async getDetails(prescriptionId: string) {
    const prescription = await this.findOrFail(prescriptionId);

    const fileUrl = await this.storage.getSignedUrl(prescription.filePath);

    const now = Date.now();
    const ageMs = now - prescription.createdAt.getTime();

    return {
      ...prescription,
      fileUrl,
      sla: {
        targetMs: SLA_TARGET_MS,
        elapsedMs: ageMs,
        breached: ageMs > SLA_TARGET_MS,
      },
    };
  }

  /**
   * Admin/pharmacist verifies (approves, rejects, or requests re-upload of)
   * a prescription. Prevents re-verification of already-processed records.
   *
   * Emits a mock notification after each action.
   */
  async verifyPrescription(
    prescriptionId: string,
    adminUserId: string,
    action: VerifyAction,
    notes?: string,
  ) {
    const prescription = await this.findOrFail(prescriptionId);

    // Prevent duplicate verification on terminal states
    if (TERMINAL_STATUSES.includes(prescription.status)) {
      throw new BadRequestException(
        `Prescription has already been ${prescription.status.toLowerCase()}. Re-verification is not allowed.`,
      );
    }

    const newStatus = this.actionToStatus(action);
    const reviewAction = this.actionToReviewAction(action);

    // Update prescription status and log the action atomically
    const [updated] = await this.prisma.$transaction([
      this.prisma.uploadedPrescription.update({
        where: { id: prescriptionId },
        data: {
          status: newStatus,
          reviewedBy: adminUserId,
          reviewNotes: notes ?? null,
          updatedAt: new Date(),
        },
      }),
      this.prisma.prescriptionReviewLog.create({
        data: {
          prescriptionId,
          action: reviewAction,
          performedBy: adminUserId,
          notes: notes ?? null,
        },
      }),
    ]);

    this.logger.log('Prescription verification action performed', {
      prescriptionId,
      action,
      adminUserId,
      newStatus,
    });

    // Mock notification (simulates push/email to patient)
    this.emitMockNotification(prescription.userId, prescriptionId, action);

    return updated;
  }

  /**
   * Block order creation if the given prescription is not APPROVED.
   * Called from the pharmacy order flow.
   */
  async assertPrescriptionApproved(prescriptionId: string): Promise<void> {
    const prescription = await this.prisma.uploadedPrescription.findUnique({
      where: { id: prescriptionId },
      select: { id: true, status: true },
    });

    if (!prescription) {
      throw new NotFoundException(`Prescription ${prescriptionId} not found.`);
    }

    if (prescription.status !== PrescriptionStatus.APPROVED) {
      throw new ForbiddenException(
        `Prescription must be APPROVED before placing an order. Current status: ${prescription.status}.`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async findOrFail(
    prescriptionId: string,
  ): Promise<UploadedPrescriptionWithUser> {
    const prescription = await this.prisma.uploadedPrescription.findUnique({
      where: { id: prescriptionId },
      include: {
        user: { select: { id: true, phone: true, email: true } },
      },
    });

    if (!prescription) {
      throw new NotFoundException(
        `Prescription with ID ${prescriptionId} not found.`,
      );
    }

    return prescription;
  }

  private actionToStatus(action: VerifyAction): PrescriptionStatus {
    switch (action) {
      case VerifyAction.APPROVE:
        return PrescriptionStatus.APPROVED;
      case VerifyAction.REJECT:
        return PrescriptionStatus.REJECTED;
      case VerifyAction.REUPLOAD:
        return PrescriptionStatus.REUPLOAD_REQUIRED;
    }
  }

  private actionToReviewAction(action: VerifyAction): PrescriptionReviewAction {
    switch (action) {
      case VerifyAction.APPROVE:
        return PrescriptionReviewAction.APPROVED;
      case VerifyAction.REJECT:
        return PrescriptionReviewAction.REJECTED;
      case VerifyAction.REUPLOAD:
        return PrescriptionReviewAction.REUPLOAD;
    }
  }

  /**
   * Simulates a notification to the patient after a verification action.
   *
   * TODO: Replace with a real NotificationsService call once a provider
   * (push/SMS/WhatsApp) is wired up. Notification copy below is a placeholder
   * and should be localised for production use.
   */
  private emitMockNotification(
    userId: string,
    prescriptionId: string,
    action: VerifyAction,
  ): void {
    // Placeholder messages — replace with NotificationsService in production.
    const messages: Record<VerifyAction, string> = {
      [VerifyAction.APPROVE]:
        'Your prescription has been approved. You can now place your order.',
      [VerifyAction.REJECT]:
        'Your prescription was rejected. Please consult your doctor.',
      [VerifyAction.REUPLOAD]:
        'Please re-upload a clearer copy of your prescription.',
    };

    this.logger.log(
      `[MOCK NOTIFICATION] → user ${userId} | prescription ${prescriptionId}: ${messages[action]}`,
    );
  }
}

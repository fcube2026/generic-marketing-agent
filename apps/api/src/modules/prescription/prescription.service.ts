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
  Role,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PrescriptionStorageService } from './prescription-storage.service';
import { VerifyAction } from './dto/verify-prescription.dto';
import { NotificationsService } from '../notifications/notifications.service';

export interface UploadedPrescriptionFile {
  fieldname?: string;
  originalname: string;
  encoding?: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/** Allowed MIME types for prescription uploads. */
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

/** Maximum allowed file size: 10 MB. */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** SLA target for prescription review (milliseconds). */
const SLA_TARGET_MS = 15 * 60 * 1000;

const REVIEWER_ROLES: Role[] = [Role.ADMIN, Role.PHARMACIST];

/** Statuses that indicate a prescription has already been processed. */
const TERMINAL_STATUSES: PrescriptionStatus[] = [
  PrescriptionStatus.APPROVED,
  PrescriptionStatus.REJECTED,
];

type UploadedPrescriptionWithUser = Prisma.UploadedPrescriptionGetPayload<{
  include: {
    user: { select: { id: true; phone: true; email: true } };
    assignedReviewer: {
      select: { id: true; phone: true; email: true; role: true };
    };
  };
}>;

interface ReviewActor {
  id: string;
  role: Role;
}

@Injectable()
export class PrescriptionService {
  private readonly logger = new Logger(PrescriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: PrescriptionStorageService,
    private readonly notificationsService: NotificationsService,
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
    file: UploadedPrescriptionFile,
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

    const assignedReviewerId = await this.selectNextReviewerId();

    // Update the record with the real storage path and initial reviewer assignment.
    await this.prisma.uploadedPrescription.update({
      where: { id: prescription.id },
      data: {
        filePath,
        assignedReviewerId,
        assignedAt: assignedReviewerId ? new Date() : null,
      },
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
          assignedReviewer: {
            select: { id: true, phone: true, email: true, role: true },
          },
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

  async getReviewers() {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: REVIEWER_ROLES },
      },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
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

  async assignReviewer(
    prescriptionId: string,
    reviewerId: string,
    actorUserId: string,
  ) {
    const prescription = await this.findOrFail(prescriptionId);

    if (prescription.status !== PrescriptionStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        'Only prescriptions pending review can be reassigned.',
      );
    }

    const reviewer = await this.findReviewerOrFail(reviewerId);

    const updated = await this.prisma.uploadedPrescription.update({
      where: { id: prescriptionId },
      data: {
        assignedReviewerId: reviewer.id,
        assignedAt: new Date(),
      },
      include: {
        user: { select: { id: true, phone: true, email: true } },
        assignedReviewer: {
          select: { id: true, phone: true, email: true, role: true },
        },
      },
    });

    this.logger.log('Prescription reviewer assignment updated', {
      prescriptionId,
      reviewerId: reviewer.id,
      actorUserId,
    });

    return updated;
  }

  /**
   * Admin/pharmacist verifies (approves, rejects, or requests re-upload of)
   * a prescription. Prevents re-verification of already-processed records.
   *
   * Emits a mock notification after each action.
   */
  async verifyPrescription(
    prescriptionId: string,
    actor: ReviewActor,
    action: VerifyAction,
    notes?: string,
  ) {
    const prescription = await this.findOrFail(prescriptionId);

    this.ensureActorCanReview(prescription, actor);

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
          assignedReviewerId: prescription.assignedReviewerId ?? actor.id,
          assignedAt: prescription.assignedAt ?? new Date(),
          reviewedBy: actor.id,
          reviewNotes: notes ?? null,
          updatedAt: new Date(),
        },
      }),
      this.prisma.prescriptionReviewLog.create({
        data: {
          prescriptionId,
          action: reviewAction,
          performedBy: actor.id,
          notes: notes ?? null,
        },
      }),
    ]);

    this.logger.log('Prescription verification action performed', {
      prescriptionId,
      action,
      adminUserId: actor.id,
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
  async assertPrescriptionApproved(
    prescriptionId: string,
    userId?: string,
  ): Promise<void> {
    const prescription = await this.prisma.uploadedPrescription.findUnique({
      where: { id: prescriptionId },
      select: { id: true, status: true, userId: true },
    });

    if (!prescription) {
      throw new NotFoundException(`Prescription ${prescriptionId} not found.`);
    }

    if (userId && prescription.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to use this prescription for an order.',
      );
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
        assignedReviewer: {
          select: { id: true, phone: true, email: true, role: true },
        },
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

  private ensureActorCanReview(
    prescription: UploadedPrescriptionWithUser,
    actor: ReviewActor,
  ) {
    if (!REVIEWER_ROLES.includes(actor.role)) {
      throw new ForbiddenException(
        'Only admins or pharmacists can review prescriptions.',
      );
    }

    if (
      actor.role === Role.PHARMACIST &&
      prescription.assignedReviewerId &&
      prescription.assignedReviewerId !== actor.id
    ) {
      throw new ForbiddenException(
        'This prescription is assigned to another reviewer.',
      );
    }
  }

  private async findReviewerOrFail(reviewerId: string) {
    const reviewer = await this.prisma.user.findFirst({
      where: {
        id: reviewerId,
        isActive: true,
        role: { in: REVIEWER_ROLES },
      },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    if (!reviewer) {
      throw new NotFoundException('Reviewer not found or inactive.');
    }

    return reviewer;
  }

  private async selectNextReviewerId(): Promise<string | null> {
    const reviewers = await this.getReviewers();

    if (reviewers.length === 0) {
      this.logger.warn(
        'No active admin or pharmacist users available for prescription assignment.',
      );
      return null;
    }

    const lastAssigned = await this.prisma.uploadedPrescription.findFirst({
      where: {
        assignedReviewerId: { not: null },
      },
      select: { assignedReviewerId: true },
      orderBy: [{ assignedAt: 'desc' }, { createdAt: 'desc' }],
    });

    if (!lastAssigned?.assignedReviewerId) {
      return reviewers[0].id;
    }

    const lastIndex = reviewers.findIndex(
      (reviewer) => reviewer.id === lastAssigned.assignedReviewerId,
    );

    if (lastIndex === -1) {
      return reviewers[0].id;
    }

    return reviewers[(lastIndex + 1) % reviewers.length].id;
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
    const messages: Record<VerifyAction, string> = {
      [VerifyAction.APPROVE]:
        'Your prescription has been approved. You can now place your order.',
      [VerifyAction.REJECT]:
        'Your prescription was rejected. Please consult your doctor.',
      [VerifyAction.REUPLOAD]:
        'Please re-upload a clearer copy of your prescription.',
    };

    const titles: Record<VerifyAction, string> = {
      [VerifyAction.APPROVE]: 'Prescription Approved',
      [VerifyAction.REJECT]: 'Prescription Rejected',
      [VerifyAction.REUPLOAD]: 'Prescription Re-upload Required',
    };

    void this.notificationsService
      .createNotification({
        userId,
        title: titles[action],
        message: messages[action],
        type: 'PRESCRIPTION_REVIEW_RESULT',
        metadata: {
          prescriptionId,
          action,
        },
      })
      .catch((error) => {
        this.logger.error(
          `Failed to notify user ${userId} for prescription ${prescriptionId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
  }
}

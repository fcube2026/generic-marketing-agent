import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrescriptionStorageService } from '../prescription/prescription-storage.service';
import type { UploadedPrescriptionFile } from '../prescription/prescription.service';
import { CreateConsultationSummaryDto } from './dto/create-consultation-summary.dto';

const ALLOWED_PRESCRIPTION_MIME = [
  'image/jpeg',
  'image/png',
  'application/pdf',
];
const MAX_PRESCRIPTION_BYTES = 10 * 1024 * 1024;

@Injectable()
export class ConsultationService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private storage: PrescriptionStorageService,
  ) {}

  async createSummary(
    bookingId: string,
    userId: string,
    dto: CreateConsultationSummaryDto,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { provider: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.provider.userId !== userId) {
      throw new ForbiddenException(
        'Only the assigned provider can submit a consultation summary',
      );
    }

    if (booking.status !== 'COMPLETED' && booking.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        `Cannot submit summary for booking in ${booking.status} status. Booking must be COMPLETED or IN_PROGRESS.`,
      );
    }

    const summary = await this.prisma.consultationSummary.upsert({
      where: { bookingId },
      create: {
        bookingId,
        ...dto,
        medicinesAdvised: dto.medicinesAdvised
          ? JSON.parse(JSON.stringify(dto.medicinesAdvised))
          : undefined,
      },
      update: {
        ...dto,
        medicinesAdvised: dto.medicinesAdvised
          ? JSON.parse(JSON.stringify(dto.medicinesAdvised))
          : undefined,
      },
    });

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'SUMMARY_SUBMITTED' },
    });

    await this.prisma.bookingStatusHistory.create({
      data: {
        bookingId,
        status: 'SUMMARY_SUBMITTED',
        changedBy: userId,
      },
    });

    return summary;
  }

  async getSummary(bookingId: string) {
    const summary = await this.prisma.consultationSummary.findUnique({
      where: { bookingId },
      include: { prescriptions: true },
    });

    if (!summary) throw new NotFoundException('Consultation summary not found');
    return summary;
  }

  async getPatientSummaries(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const patientProfile = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });

    if (!patientProfile) {
      return { data: [], total: 0, page, limit };
    }

    const where = {
      booking: { patientId: patientProfile.id },
    };

    const [summaries, total] = await Promise.all([
      this.prisma.consultationSummary.findMany({
        where,
        include: {
          prescriptions: true,
          booking: {
            include: {
              provider: true,
              serviceCategory: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.consultationSummary.count({ where }),
    ]);

    return { data: summaries, total, page, limit };
  }

  /**
   * Return the most recent consultation summary for the authenticated patient,
   * shaped for the "Use Recent Prescription" flow on the patient app.
   *
   * Response:
   *   {
   *     medicines: medicinesAdvised || [],
   *     prescriptionUrl: latestPrescription?.fileUrl || null,
   *     consultationId,
   *     createdAt,
   *   }
   *
   * If the patient has no consultation summary yet, returns null so the
   * frontend can show a "No recent prescription found" hint.
   */
  async getLatestForPatient(userId: string) {
    const patientProfile = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });

    if (!patientProfile) {
      return null;
    }

    const summary = await this.prisma.consultationSummary.findFirst({
      where: { booking: { patientId: patientProfile.id } },
      orderBy: { createdAt: 'desc' },
      include: {
        prescriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!summary) {
      return null;
    }

    const latestPrescription = summary.prescriptions[0];
    const medicines = Array.isArray(summary.medicinesAdvised)
      ? summary.medicinesAdvised
      : [];

    let prescriptionUrl: string | null = null;
    if (latestPrescription?.fileUrl) {
      try {
        // fileUrl stores the storage path; re-sign on each fetch.
        prescriptionUrl = await this.storage.getSignedUrl(
          latestPrescription.fileUrl,
        );
      } catch {
        // If the value is already a public URL, fall back to it as-is.
        prescriptionUrl = latestPrescription.fileUrl;
      }
    }

    return {
      consultationId: summary.id,
      createdAt: summary.createdAt,
      medicines,
      prescriptionUrl,
    };
  }

  /**
   * Add a prescription to a consultation summary
   * Sends notification to the patient
   */
  async addPrescription(
    bookingId: string,
    userId: string,
    data: { details?: string; fileUrl?: string },
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        provider: true,
        patient: { include: { user: true } },
        consultationSummary: true,
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.provider.userId !== userId) {
      throw new ForbiddenException(
        'Only the assigned provider can add prescriptions',
      );
    }

    if (!booking.consultationSummary) {
      throw new BadRequestException(
        'Consultation summary must be created before adding prescriptions',
      );
    }

    const prescription = await this.prisma.prescription.create({
      data: {
        consultationSummaryId: booking.consultationSummary.id,
        details: data.details,
        fileUrl: data.fileUrl,
      },
    });

    // Send notification to patient
    await this.notificationsService.sendNotification(
      {
        userId: booking.patient.userId,
        title: 'Prescription Available',
        message: `Dr. ${booking.provider.name} has uploaded your prescription. View it in the app.`,
        type: 'PRESCRIPTION_UPLOADED',
        metadata: {
          bookingId,
          prescriptionId: prescription.id,
        },
      },
      {
        inApp: true,
        push: true,
        whatsapp: true,
        sms: false,
        whatsappTemplate: 'PRESCRIPTION_UPLOADED',
        smsTemplate: 'PRESCRIPTION_UPLOADED',
        templateParams: {
          providerName: booking.provider.name,
        },
        idempotencyKey: `prescription_${prescription.id}`,
      },
    );

    return prescription;
  }

  /**
   * Provider uploads a prescription file (image or PDF) and/or text details
   * for a booking after the consultation summary has been submitted. Stored
   * in the private prescriptions bucket; the patient app fetches the latest
   * via /consultation/latest.
   */
  async uploadPrescriptionFile(
    bookingId: string,
    userId: string,
    file: UploadedPrescriptionFile | undefined,
    details: string | undefined,
  ) {
    if (!file && !details?.trim()) {
      throw new BadRequestException(
        'Provide a prescription file, details, or both.',
      );
    }

    if (file) {
      if (!ALLOWED_PRESCRIPTION_MIME.includes(file.mimetype)) {
        throw new BadRequestException(
          'Invalid file type. Only JPEG, PNG, and PDF are accepted.',
        );
      }
      if (file.size > MAX_PRESCRIPTION_BYTES) {
        throw new BadRequestException('File size exceeds the 10 MB limit.');
      }
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        provider: true,
        patient: { include: { user: true } },
        consultationSummary: true,
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.provider.userId !== userId) {
      throw new ForbiddenException(
        'Only the assigned provider can upload prescriptions',
      );
    }
    if (!booking.consultationSummary) {
      throw new BadRequestException(
        'Submit the consultation summary before uploading a prescription.',
      );
    }

    let storagePath: string | undefined;
    let signedUrl: string | undefined;

    if (file) {
      // Reuse the prescriptions bucket; key by patient userId + summary id.
      const tmpId = `${booking.consultationSummary.id}_${Date.now()}`;
      storagePath = await this.storage.uploadFile(
        booking.patient.userId,
        tmpId,
        file.buffer,
        file.mimetype,
      );
      signedUrl = await this.storage.getSignedUrl(storagePath);
    }

    const prescription = await this.prisma.prescription.create({
      data: {
        consultationSummaryId: booking.consultationSummary.id,
        details: details?.trim() || undefined,
        // Persist the storage path so we can re-sign later. The signed URL
        // returned in the response is short-lived (5 min).
        fileUrl: storagePath,
      },
    });

    await this.notificationsService
      .sendNotification(
        {
          userId: booking.patient.userId,
          title: 'Prescription Available',
          message: `Dr. ${booking.provider.name} has uploaded your prescription. View it in the app.`,
          type: 'PRESCRIPTION_UPLOADED',
          metadata: { bookingId, prescriptionId: prescription.id },
        },
        {
          inApp: true,
          push: true,
          whatsapp: true,
          sms: false,
          whatsappTemplate: 'PRESCRIPTION_UPLOADED',
          smsTemplate: 'PRESCRIPTION_UPLOADED',
          templateParams: { providerName: booking.provider.name },
          idempotencyKey: `prescription_${prescription.id}`,
        },
      )
      .catch(() => undefined);

    return {
      id: prescription.id,
      details: prescription.details,
      fileUrl: signedUrl ?? null,
      storagePath,
      createdAt: prescription.createdAt,
    };
  }
}

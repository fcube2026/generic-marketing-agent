import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateConsultationSummaryDto } from './dto/create-consultation-summary.dto';
import { PrescriptionStorageService } from '../prescription/prescription-storage.service';

interface UploadedConsultationPrescriptionFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const ALLOWED_PRESCRIPTION_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
];

const MAX_PRESCRIPTION_FILE_SIZE_BYTES = 10 * 1024 * 1024;

@Injectable()
export class ConsultationService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private prescriptionStorageService: PrescriptionStorageService,
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

    if (
      booking.status !== 'COMPLETED' &&
      booking.status !== 'IN_PROGRESS' &&
      booking.status !== 'SUMMARY_SUBMITTED'
    ) {
      throw new BadRequestException(
        `Cannot submit summary for booking in ${booking.status} status. Booking must be COMPLETED, IN_PROGRESS, or SUMMARY_SUBMITTED.`,
      );
    }

    const summary = await this.prisma.consultationSummary.upsert({
      where: { bookingId },
      create: {
        bookingId,
        ...dto,
      },
      update: {
        ...dto,
      },
    });

    if (booking.status !== 'SUMMARY_SUBMITTED') {
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
    }

    return summary;
  }

  async getSummary(bookingId: string) {
    const [summary, pharmacyOrder] = await Promise.all([
      this.prisma.consultationSummary.findUnique({
        where: { bookingId },
        include: {
          prescriptions: {
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.pharmacyOrder.findFirst({
        where: { bookingId },
        select: { id: true },
      }),
    ]);

    if (!summary) throw new NotFoundException('Consultation summary not found');
    const latestPrescription = summary.prescriptions[0];
    return {
      ...summary,
      prescriptionUrl: latestPrescription?.fileUrl ?? null,
      hasOrder: !!pharmacyOrder,
      orderId: pharmacyOrder?.id ?? null,
    };
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

    return {
      consultationId: summary.id,
      createdAt: summary.createdAt,
      medicines,
      prescriptionUrl: latestPrescription?.fileUrl ?? null,
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

    const details = data.details?.trim();
    const fileUrl = data.fileUrl?.trim();
    if (!details && !fileUrl) {
      throw new BadRequestException(
        'Either prescription details or file URL is required',
      );
    }

    const prescription = await this.prisma.prescription.create({
      data: {
        consultationSummaryId: booking.consultationSummary.id,
        details,
        fileUrl,
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

  async addPrescriptionWithFile(
    bookingId: string,
    userId: string,
    file: UploadedConsultationPrescriptionFile,
    details?: string,
  ) {
    if (!ALLOWED_PRESCRIPTION_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, and PDF are accepted.',
      );
    }

    if (file.size > MAX_PRESCRIPTION_FILE_SIZE_BYTES) {
      throw new BadRequestException('File size exceeds the 10 MB limit.');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        provider: true,
        patient: { include: { user: true } },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.provider.userId !== userId) {
      throw new ForbiddenException(
        'Only the assigned provider can add prescriptions',
      );
    }

    const filePath = await this.prescriptionStorageService.uploadFile(
      booking.patient.userId,
      `consultation-${bookingId}-${Date.now()}`,
      file.buffer,
      file.mimetype,
    );
    const fileUrl =
      await this.prescriptionStorageService.getSignedUrl(filePath);

    return this.addPrescription(bookingId, userId, {
      details,
      fileUrl,
    });
  }
}

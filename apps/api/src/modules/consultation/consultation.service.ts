import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateConsultationSummaryDto } from './dto/create-consultation-summary.dto';

@Injectable()
export class ConsultationService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
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
}

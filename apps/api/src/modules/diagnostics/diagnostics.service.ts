import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateDiagnosticRequestDto,
  UpdateDiagnosticStatusDto,
  UploadLabResultDto,
} from './dto/create-diagnostic-request.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DiagnosticsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async createRequest(dto: CreateDiagnosticRequestDto, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { provider: true, patient: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.provider.userId !== userId) {
      throw new ForbiddenException(
        'Only the assigned provider can request diagnostics',
      );
    }

    const diagnosticRequest = await this.prisma.diagnosticRequest.create({
      data: {
        bookingId: dto.bookingId,
        testType: dto.testType,
        notes: dto.notes,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        status: 'REQUESTED',
      },
    });

    // Send notification to patient about the diagnostic test
    try {
      const scheduledTime = dto.scheduledAt
        ? new Date(dto.scheduledAt).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })
        : undefined;

      await this.notificationsService.sendNotification(
        {
          userId: booking.patient.userId,
          title: 'Diagnostic Test Booked',
          message: `Dr. ${booking.provider.name} has requested a "${dto.testType}" test${scheduledTime ? ` scheduled for ${scheduledTime}` : ''}.`,
          type: 'DIAGNOSTIC_BOOKED',
          metadata: {
            diagnosticRequestId: diagnosticRequest.id,
            testType: dto.testType,
            bookingId: dto.bookingId,
          },
        },
        {
          inApp: true,
          push: true,
          whatsapp: true,
          sms: false, // WhatsApp will fallback to SMS if needed
          whatsappTemplate: 'DIAGNOSTIC_BOOKED',
          templateParams: {
            testType: dto.testType,
            scheduledTime: scheduledTime || 'To be scheduled',
          },
          idempotencyKey: `diagnostic_${diagnosticRequest.id}`,
        },
      );
    } catch {
      // Notification failure should not block the diagnostic request
    }

    return diagnosticRequest;
  }

  async updateStatus(
    id: string,
    dto: UpdateDiagnosticStatusDto,
    _userId: string,
  ) {
    const request = await this.prisma.diagnosticRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('Diagnostic request not found');

    return this.prisma.diagnosticRequest.update({
      where: { id },
      data: {
        status: dto.status as any,
        ...(dto.scheduledAt && { scheduledAt: new Date(dto.scheduledAt) }),
      },
    });
  }

  async uploadResult(id: string, dto: UploadLabResultDto, _userId: string) {
    const request = await this.prisma.diagnosticRequest.findUnique({
      where: { id },
      include: {
        booking: {
          include: { patient: true },
        },
      },
    });
    if (!request) throw new NotFoundException('Diagnostic request not found');

    const result = await this.prisma.labResult.create({
      data: {
        diagnosticRequestId: id,
        resultFileUrl: dto.resultFileUrl,
        notes: dto.notes,
      },
    });

    await this.prisma.diagnosticRequest.update({
      where: { id },
      data: { status: 'RESULTED' },
    });

    // Send notification with push and WhatsApp (SMS fallback)
    try {
      await this.notificationsService.sendNotification(
        {
          userId: request.booking.patient.userId,
          title: 'Lab Result Ready',
          message: `Your lab result for "${request.testType}" is now available. Please check your diagnostics section.`,
          type: 'LAB_RESULT_READY',
          metadata: {
            diagnosticRequestId: id,
            testType: request.testType,
            bookingId: request.bookingId,
          },
        },
        {
          inApp: true,
          push: true,
          whatsapp: true,
          sms: false, // WhatsApp will fallback to SMS if needed
          whatsappTemplate: 'LAB_RESULT_READY',
          smsTemplate: 'LAB_RESULT_READY',
          templateParams: { testType: request.testType },
          idempotencyKey: `lab_result_${result.id}`,
        },
      );
    } catch {
      // Notification failure should not block the result upload
    }

    return result;
  }

  async getPatientDiagnostics(
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

    const [diagnostics, total] = await Promise.all([
      this.prisma.diagnosticRequest.findMany({
        where,
        include: {
          labResults: true,
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
      this.prisma.diagnosticRequest.count({ where }),
    ]);

    return { data: diagnostics, total, page, limit };
  }
}

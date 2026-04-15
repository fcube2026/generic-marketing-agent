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
      include: { provider: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.provider.userId !== userId) {
      throw new ForbiddenException(
        'Only the assigned provider can request diagnostics',
      );
    }

    return this.prisma.diagnosticRequest.create({
      data: {
        bookingId: dto.bookingId,
        testType: dto.testType,
        notes: dto.notes,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        status: 'REQUESTED',
      },
    });
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

    // Send notification with push and SMS
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
          sms: true,
          smsTemplate: 'LAB_RESULT_READY',
          smsParams: { testType: request.testType },
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

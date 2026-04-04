import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDiagnosticRequestDto, UpdateDiagnosticStatusDto, UploadLabResultDto } from './dto/create-diagnostic-request.dto';

@Injectable()
export class DiagnosticsService {
  constructor(private prisma: PrismaService) {}

  async createRequest(dto: CreateDiagnosticRequestDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id: dto.bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

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

  async updateStatus(id: string, dto: UpdateDiagnosticStatusDto) {
    const request = await this.prisma.diagnosticRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Diagnostic request not found');

    return this.prisma.diagnosticRequest.update({
      where: { id },
      data: {
        status: dto.status as any,
        ...(dto.scheduledAt && { scheduledAt: new Date(dto.scheduledAt) }),
      },
    });
  }

  async uploadResult(id: string, dto: UploadLabResultDto) {
    const request = await this.prisma.diagnosticRequest.findUnique({ where: { id } });
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

    return result;
  }
}

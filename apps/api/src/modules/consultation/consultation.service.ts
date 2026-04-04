import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateConsultationSummaryDto } from './dto/create-consultation-summary.dto';

@Injectable()
export class ConsultationService {
  constructor(private prisma: PrismaService) {}

  async createSummary(
    bookingId: string,
    userId: string,
    dto: CreateConsultationSummaryDto,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');

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
}

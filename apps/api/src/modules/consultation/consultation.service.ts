import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
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
}

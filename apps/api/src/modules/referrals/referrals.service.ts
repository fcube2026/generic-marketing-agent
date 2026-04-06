import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateReferralDto,
  UpdateReferralStatusDto,
} from './dto/create-referral.dto';

@Injectable()
export class ReferralsService {
  constructor(private prisma: PrismaService) {}

  async createReferral(dto: CreateReferralDto, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { provider: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.provider.userId !== userId) {
      throw new ForbiddenException(
        'Only the assigned provider can create referrals',
      );
    }

    return this.prisma.referral.create({
      data: {
        bookingId: dto.bookingId,
        specialistType: dto.specialistType,
        notes: dto.notes,
        status: 'RECOMMENDED',
      },
    });
  }

  async updateStatus(id: string, dto: UpdateReferralStatusDto) {
    const referral = await this.prisma.referral.findUnique({
      where: { id },
    });
    if (!referral) throw new NotFoundException('Referral not found');

    return this.prisma.referral.update({
      where: { id },
      data: { status: dto.status as any },
    });
  }

  async getPatientReferrals(
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

    const [referrals, total] = await Promise.all([
      this.prisma.referral.findMany({
        where,
        include: {
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
      this.prisma.referral.count({ where }),
    ]);

    return { data: referrals, total, page, limit };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PayoutsService {
  constructor(private prisma: PrismaService) {}

  async getProviderPayouts(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');

    return this.prisma.payout.findMany({
      where: { providerId: profile.id },
      include: {
        booking: {
          include: {
            patient: true,
            serviceCategory: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProviderEarningsSummary(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');

    const [totalAgg, pendingAgg, processedAgg] = await Promise.all([
      this.prisma.payout.aggregate({
        where: { providerId: profile.id },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payout.aggregate({
        where: { providerId: profile.id, status: 'PENDING' },
        _sum: { amount: true },
      }),
      this.prisma.payout.aggregate({
        where: { providerId: profile.id, status: 'PROCESSED' },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalEarnings: totalAgg._sum.amount || 0,
      pendingAmount: pendingAgg._sum.amount || 0,
      processedAmount: processedAgg._sum.amount || 0,
      totalPayouts: totalAgg._count,
    };
  }
}

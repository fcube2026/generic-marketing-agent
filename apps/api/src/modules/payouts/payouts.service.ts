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

    const payouts = await this.prisma.payout.findMany({
      where: { providerId: profile.id },
    });

    const totalEarnings = payouts.reduce((sum, p) => sum + p.amount, 0);
    const pendingAmount = payouts
      .filter((p) => p.status === 'PENDING')
      .reduce((sum, p) => sum + p.amount, 0);
    const processedAmount = payouts
      .filter((p) => p.status === 'PROCESSED')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      totalEarnings,
      pendingAmount,
      processedAmount,
      totalPayouts: payouts.length,
    };
  }
}

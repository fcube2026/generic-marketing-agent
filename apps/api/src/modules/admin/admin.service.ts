import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getAllProviders(status?: string) {
    const where: Record<string, unknown> = {};

    if (status === 'pending') {
      where.isVerified = false;
      where.isActive = true;
    } else if (status === 'active') {
      where.isVerified = true;
      where.isActive = true;
    } else if (status === 'rejected') {
      where.isVerified = false;
      where.isActive = false;
    }

    return this.prisma.providerProfile.findMany({
      where,
      include: {
        user: true,
        licenses: true,
        providerServices: { include: { serviceCategory: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProviderById(providerId: string) {
    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: providerId },
      include: {
        user: true,
        licenses: true,
        providerServices: { include: { serviceCategory: true } },
      },
    });
    if (!provider) throw new NotFoundException('Provider not found');
    return provider;
  }

  async getPendingProviders() {
    return this.prisma.providerProfile.findMany({
      where: { isVerified: false, isActive: true },
      include: {
        user: true,
        licenses: true,
        providerServices: { include: { serviceCategory: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async verifyProvider(providerId: string, adminId: string, notes?: string) {
    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: providerId },
    });
    if (!provider) throw new NotFoundException('Provider not found');

    await this.prisma.providerLicense.updateMany({
      where: { providerId },
      data: { verifiedAt: new Date() },
    });

    const updated = await this.prisma.providerProfile.update({
      where: { id: providerId },
      data: { isVerified: true, isActive: true },
    });

    await this.prisma.adminAction.create({
      data: {
        adminId,
        action: 'VERIFY_PROVIDER',
        targetId: providerId,
        targetType: 'ProviderProfile',
        notes,
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: provider.userId,
        title: 'Account Approved',
        message:
          'Your provider account has been verified and approved. You can now start accepting bookings.',
        type: 'PROVIDER_APPROVED',
        metadata: { providerId },
      },
    });

    return updated;
  }

  async rejectProvider(providerId: string, adminId: string, reason?: string) {
    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: providerId },
    });
    if (!provider) throw new NotFoundException('Provider not found');

    const updated = await this.prisma.providerProfile.update({
      where: { id: providerId },
      data: { isVerified: false, isActive: false },
    });

    await this.prisma.adminAction.create({
      data: {
        adminId,
        action: 'REJECT_PROVIDER',
        targetId: providerId,
        targetType: 'ProviderProfile',
        notes: reason,
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: provider.userId,
        title: 'Account Rejected',
        message: reason
          ? `Your provider account verification was not approved. Reason: ${reason}`
          : 'Your provider account verification was not approved. Please contact support for more information.',
        type: 'PROVIDER_REJECTED',
        metadata: { providerId, reason },
      },
    });

    return updated;
  }

  async deactivateProvider(
    providerId: string,
    adminId: string,
    notes?: string,
  ) {
    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: providerId },
    });
    if (!provider) throw new NotFoundException('Provider not found');

    const updated = await this.prisma.providerProfile.update({
      where: { id: providerId },
      data: { isActive: false, isAvailable: false },
    });

    await this.prisma.adminAction.create({
      data: {
        adminId,
        action: 'DEACTIVATE_PROVIDER',
        targetId: providerId,
        targetType: 'ProviderProfile',
        notes,
      },
    });

    return updated;
  }

  async getAllBookings(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as any } : {};

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          patient: true,
          provider: true,
          serviceCategory: true,
          payment: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDiagnosticsOverview() {
    return this.prisma.diagnosticRequest.findMany({
      where: { status: { not: 'RESULTED' } },
      include: {
        booking: {
          include: { patient: true, provider: true },
        },
        labResults: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDashboardStats() {
    const [totalBookings, activeProviders, pendingVerification, totalPatients] =
      await Promise.all([
        this.prisma.booking.count(),
        this.prisma.providerProfile.count({
          where: { isActive: true, isAvailable: true },
        }),
        this.prisma.providerProfile.count({
          where: { isVerified: false, isActive: true },
        }),
        this.prisma.patientProfile.count(),
      ]);

    return {
      totalBookings,
      activeProviders,
      pendingVerification,
      totalPatients,
    };
  }

  async getAllPayouts(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as any } : {};

    const [payouts, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        include: {
          provider: true,
          booking: {
            include: {
              patient: true,
              serviceCategory: true,
              payment: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payout.count({ where }),
    ]);

    return {
      data: payouts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPayoutsSummary() {
    const [totalAgg, pendingAgg, processedAgg] = await Promise.all([
      this.prisma.payout.aggregate({
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payout.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payout.aggregate({
        where: { status: 'PROCESSED' },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      totalPayouts: totalAgg._count,
      pendingCount: pendingAgg._count,
      processedCount: processedAgg._count,
      totalAmount: totalAgg._sum.amount || 0,
      pendingAmount: pendingAgg._sum.amount || 0,
      processedAmount: processedAgg._sum.amount || 0,
    };
  }

  async processPayoutRecord(payoutId: string, adminId: string) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
    });
    if (!payout) throw new NotFoundException('Payout not found');

    const updated = await this.prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    });

    await this.prisma.adminAction.create({
      data: {
        adminId,
        action: 'PROCESS_PAYOUT',
        targetId: payoutId,
        targetType: 'Payout',
      },
    });

    return updated;
  }
}

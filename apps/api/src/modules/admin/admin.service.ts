import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

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
      data: { isVerified: true },
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
}

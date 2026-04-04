import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProviderProfileDto } from './dto/create-provider-profile.dto';
import { UpdateProviderProfileDto } from './dto/update-provider-profile.dto';
import { UpdateProviderAvailabilityDto } from './dto/update-provider-availability.dto';

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

  async onboard(userId: string, dto: CreateProviderProfileDto) {
    const { serviceCategoryIds, ...profileData } = dto;

    const existing = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (existing) {
      return this.updateProfile(userId, dto);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { role: 'PROVIDER' },
    });

    const profile = await this.prisma.providerProfile.create({
      data: {
        ...profileData,
        userId,
      },
    });

    if (serviceCategoryIds && serviceCategoryIds.length > 0) {
      await this.prisma.providerService.createMany({
        data: serviceCategoryIds.map((id) => ({
          providerId: profile.id,
          serviceCategoryId: id,
        })),
        skipDuplicates: true,
      });
    }

    return this.prisma.providerProfile.findUnique({
      where: { id: profile.id },
      include: { providerServices: { include: { serviceCategory: true } }, user: true },
    });
  }

  async getMyProfile(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
      include: {
        user: true,
        providerServices: { include: { serviceCategory: true } },
        availabilitySlots: true,
        licenses: true,
      },
    });

    if (!profile) throw new NotFoundException('Provider profile not found');
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProviderProfileDto) {
    const { serviceCategoryIds, ...profileData } = dto as any;

    const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Provider profile not found');

    const updated = await this.prisma.providerProfile.update({
      where: { userId },
      data: profileData,
    });

    if (serviceCategoryIds) {
      await this.prisma.providerService.deleteMany({ where: { providerId: profile.id } });
      if (serviceCategoryIds.length > 0) {
        await this.prisma.providerService.createMany({
          data: serviceCategoryIds.map((id: string) => ({
            providerId: profile.id,
            serviceCategoryId: id,
          })),
          skipDuplicates: true,
        });
      }
    }

    return this.prisma.providerProfile.findUnique({
      where: { id: profile.id },
      include: { providerServices: { include: { serviceCategory: true } } },
    });
  }

  async updateAvailability(userId: string, dto: UpdateProviderAvailabilityDto) {
    const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Provider profile not found');

    return this.prisma.providerProfile.update({
      where: { userId },
      data: {
        isAvailable: dto.isAvailable,
        ...(dto.currentLat && { currentLat: dto.currentLat }),
        ...(dto.currentLng && { currentLng: dto.currentLng }),
      },
    });
  }

  async getMyBookings(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Provider profile not found');

    return this.prisma.booking.findMany({
      where: { providerId: profile.id },
      include: {
        patient: true,
        serviceCategory: true,
        address: true,
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getNearbyProviders(lat: number, lng: number, serviceCategory?: string, mode?: string) {
    const providers = await this.prisma.providerProfile.findMany({
      where: {
        isAvailable: true,
        isActive: true,
        isVerified: true,
        currentLat: { not: null },
        currentLng: { not: null },
        ...(serviceCategory && {
          providerServices: {
            some: {
              serviceCategory: { slug: serviceCategory },
            },
          },
        }),
        ...(mode === 'HOME_VISIT' && { homeVisitEnabled: true }),
        ...(mode === 'DOCTOR_PLACE' && { doctorPlaceVisitEnabled: true }),
      },
      include: {
        providerServices: { include: { serviceCategory: true } },
        user: true,
      },
    });

    const withDistance = providers
      .map((provider) => {
        if (!provider.currentLat || !provider.currentLng) return null;
        const distance = haversineDistance(lat, lng, provider.currentLat, provider.currentLng);
        return { ...provider, distance };
      })
      .filter(Boolean)
      .filter((p: any) => p.distance <= p.serviceRadius)
      .sort((a: any, b: any) => a.distance - b.distance);

    return withDistance;
  }
}

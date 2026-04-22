import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProviderProfileDto } from './dto/create-provider-profile.dto';
import { UpdateProviderProfileDto } from './dto/update-provider-profile.dto';
import { UpdateProviderAvailabilityDto } from './dto/update-provider-availability.dto';
import { UploadKycDocumentDto } from './dto/upload-kyc-document.dto';

const GENERIC_SERVICE_SLUGS = ['doctor', 'general-medicine'];

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
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

  private async findBestServiceCategory(specialization: string) {
    if (!specialization || typeof specialization !== 'string') return null;

    const normalizedSpecialization = specialization.trim().toLowerCase();
    if (!normalizedSpecialization) return null;
    const specializationSlug = normalizedSpecialization
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const directSlugMatch = await this.prisma.serviceCategory.findFirst({
      where: { slug: specializationSlug },
    });
    if (directSlugMatch) return directSlugMatch;

    const directNameMatch = await this.prisma.serviceCategory.findFirst({
      where: {
        name: {
          equals: specialization,
          mode: 'insensitive',
        },
      },
    });
    if (directNameMatch) return directNameMatch;

    const categories = await this.prisma.serviceCategory.findMany();

    const compactSpec = normalizedSpecialization.replace(/[^a-z0-9]/g, '');
    const fuzzyMatch = categories.find((category) => {
      if (!category.name || !category.slug) return false;
      const compactName = category.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const compactSlug = category.slug.toLowerCase().replace(/[^a-z0-9]/g, '');
      return (
        compactSpec.includes(compactName) ||
        compactSpec.includes(compactSlug) ||
        compactName.includes(compactSpec) ||
        compactSlug.includes(compactSpec)
      );
    });

    return fuzzyMatch ?? null;
  }

  private async ensureProviderServiceLink(
    providerId: string,
    specialization: string,
  ) {
    const matchedCategory = await this.findBestServiceCategory(specialization);

    if (matchedCategory) {
      await this.prisma.providerService.createMany({
        data: [{ providerId, serviceCategoryId: matchedCategory.id }],
        skipDuplicates: true,
      });

      if (!GENERIC_SERVICE_SLUGS.includes(matchedCategory.slug)) {
        await this.prisma.providerService.deleteMany({
          where: {
            providerId,
            serviceCategory: {
              slug: { in: GENERIC_SERVICE_SLUGS },
            },
            serviceCategoryId: { not: matchedCategory.id },
          },
        });
      }

      return;
    }

    const existingCount = await this.prisma.providerService.count({
      where: { providerId },
    });
    if (existingCount > 0) return;

    const fallbackCategory =
      (await this.prisma.serviceCategory.findFirst({
        where: { slug: 'doctor' },
      })) ||
      (await this.prisma.serviceCategory.findFirst({
        where: { slug: 'general-medicine' },
      }));

    if (!fallbackCategory) return;

    await this.prisma.providerService.createMany({
      data: [{ providerId, serviceCategoryId: fallbackCategory.id }],
      skipDuplicates: true,
    });
  }

  private validateServiceConfig(
    dto: CreateProviderProfileDto | UpdateProviderProfileDto,
  ) {
    if (
      dto.homeVisitEnabled &&
      (dto.consultationFeeHomeVisit === undefined ||
        dto.consultationFeeHomeVisit <= 0)
    ) {
      throw new BadRequestException(
        'Home visit fee must be greater than 0 when home visit is enabled',
      );
    }
    if (
      dto.doctorPlaceVisitEnabled &&
      (dto.consultationFeeDoctorPlace === undefined ||
        dto.consultationFeeDoctorPlace <= 0)
    ) {
      throw new BadRequestException(
        'Clinic visit fee must be greater than 0 when clinic visit is enabled',
      );
    }
  }

  private async validateServiceCategoryIds(ids: string[]) {
    if (ids.length === 0) return;
    const uniqueIds = [...new Set(ids)];
    const categories = await this.prisma.serviceCategory.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });
    if (categories.length !== uniqueIds.length) {
      throw new BadRequestException(
        'One or more service category IDs are invalid',
      );
    }
  }

  async onboard(userId: string, dto: CreateProviderProfileDto) {
    const { serviceCategoryIds, ...profileData } = dto;

    const existing = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (existing) {
      return this.updateProfile(userId, dto);
    }

    this.validateServiceConfig(dto);

    if (serviceCategoryIds && serviceCategoryIds.length > 0) {
      await this.validateServiceCategoryIds(serviceCategoryIds);
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

    await this.ensureProviderServiceLink(profile.id, profile.specialization);

    return this.prisma.providerProfile.findUnique({
      where: { id: profile.id },
      include: {
        providerServices: { include: { serviceCategory: true } },
        user: true,
      },
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

    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');

    this.validateServiceConfig(dto);

    if (serviceCategoryIds && serviceCategoryIds.length > 0) {
      await this.validateServiceCategoryIds(serviceCategoryIds);
    }

    await this.prisma.providerProfile.update({
      where: { userId },
      data: profileData,
    });

    if (serviceCategoryIds) {
      await this.prisma.providerService.deleteMany({
        where: { providerId: profile.id },
      });
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

    await this.ensureProviderServiceLink(
      profile.id,
      profileData.specialization ?? profile.specialization ?? '',
    );

    return this.prisma.providerProfile.findUnique({
      where: { id: profile.id },
      include: { providerServices: { include: { serviceCategory: true } } },
    });
  }

  async updateAvailability(userId: string, dto: UpdateProviderAvailabilityDto) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');

    return this.prisma.providerProfile.update({
      where: { userId },
      data: {
        isAvailable: dto.isAvailable,
        ...(dto.currentLat !== undefined && { currentLat: dto.currentLat }),
        ...(dto.currentLng !== undefined && { currentLng: dto.currentLng }),
        ...(dto.serviceRadius !== undefined && {
          serviceRadius: dto.serviceRadius,
        }),
      },
    });
  }

  async getMyBookings(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
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

  async getIncomingRequests(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');

    return this.prisma.booking.findMany({
      where: { providerId: profile.id, status: 'REQUESTED' },
      include: {
        patient: true,
        serviceCategory: true,
        address: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getNearbyProviders(
    lat: number,
    lng: number,
    serviceCategory?: string,
    mode?: string,
  ) {
    const normalizedCategorySlug = serviceCategory
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const categoryLabel = normalizedCategorySlug?.replace(/-/g, ' ');
    const shouldApplyCategoryFilter =
      normalizedCategorySlug && normalizedCategorySlug !== 'doctor';

    const providers = await this.prisma.providerProfile.findMany({
      where: {
        isAvailable: true,
        isActive: true,
        isVerified: true,
        currentLat: { not: null },
        currentLng: { not: null },
        ...(shouldApplyCategoryFilter && {
          OR: [
            {
              providerServices: {
                some: {
                  serviceCategory: { slug: normalizedCategorySlug },
                },
              },
            },
            {
              specialization: {
                contains: normalizedCategorySlug,
                mode: 'insensitive',
              },
            },
            {
              specialization: {
                contains: categoryLabel,
                mode: 'insensitive',
              },
            },
          ],
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
        if (provider.currentLat == null || provider.currentLng == null)
          return null;
        const distance = haversineDistance(
          lat,
          lng,
          provider.currentLat,
          provider.currentLng,
        );
        const effectiveServiceRadius =
          typeof provider.serviceRadius === 'number' &&
          provider.serviceRadius > 0
            ? provider.serviceRadius
            : 10;

        return { ...provider, distance, serviceRadius: effectiveServiceRadius };
      })
      .filter(Boolean)
      .filter((p: any) => p.distance <= p.serviceRadius)
      .sort((a: any, b: any) => a.distance - b.distance);

    return withDistance;
  }

  async uploadKycDocument(userId: string, dto: UploadKycDocumentDto) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');

    const document = await this.prisma.providerLicense.create({
      data: {
        providerId: profile.id,
        type: dto.type,
        documentUrl: dto.documentUrl,
        status: 'PENDING',
        ...(dto.expiresAt && { expiresAt: new Date(dto.expiresAt) }),
      },
    });

    return document;
  }

  async getKycDocuments(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');

    return this.prisma.providerLicense.findMany({
      where: { providerId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteKycDocument(userId: string, documentId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');

    const document = await this.prisma.providerLicense.findFirst({
      where: { id: documentId, providerId: profile.id },
    });
    if (!document) throw new NotFoundException('Document not found');

    if (document.status === 'APPROVED') {
      throw new BadRequestException('Cannot delete an approved document');
    }

    await this.prisma.providerLicense.delete({
      where: { id: documentId },
    });

    return { message: 'Document deleted successfully' };
  }
}

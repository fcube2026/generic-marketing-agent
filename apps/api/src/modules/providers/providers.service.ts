import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SupabaseSyncService } from '../../common/supabase/supabase-sync.service';
import { CreateProviderProfileDto } from './dto/create-provider-profile.dto';
import { UpdateProviderProfileDto } from './dto/update-provider-profile.dto';
import { UpdateProviderAvailabilityDto } from './dto/update-provider-availability.dto';
import { UploadKycDocumentDto } from './dto/upload-kyc-document.dto';

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
  constructor(
    private prisma: PrismaService,
    private readonly supabaseSync: SupabaseSyncService,
  ) {}

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

    return this.prisma.providerProfile.findUnique({
      where: { id: profile.id },
      include: {
        providerServices: { include: { serviceCategory: true } },
        user: true,
      },
    }).then(async (full) => {
      if (full) await this.supabaseSync.syncProvider(full);
      return full;
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

    return this.prisma.providerProfile.findUnique({
      where: { id: profile.id },
      include: { providerServices: { include: { serviceCategory: true } } },
    }).then(async (full) => {
      if (full) await this.supabaseSync.syncProvider(full);
      return full;
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
        ...(dto.currentLat && { currentLat: dto.currentLat }),
        ...(dto.currentLng && { currentLng: dto.currentLng }),
      },
    }).then(async (updated) => {
      await this.supabaseSync.syncProvider(updated);
      return updated;
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

  async getDashboard(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayConsultations, upcoming, completed, earnings] =
      await Promise.all([
        this.prisma.booking.count({
          where: {
            providerId: profile.id,
            scheduledAt: { gte: today, lt: tomorrow },
          },
        }),
        this.prisma.booking.count({
          where: {
            providerId: profile.id,
            status: { in: ['REQUESTED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED'] },
            scheduledAt: { gte: today },
          },
        }),
        this.prisma.booking.count({
          where: {
            providerId: profile.id,
            status: { in: ['COMPLETED', 'SUMMARY_SUBMITTED', 'CLOSED'] },
          },
        }),
        this.prisma.booking.aggregate({
          where: {
            providerId: profile.id,
            status: { in: ['COMPLETED', 'SUMMARY_SUBMITTED', 'CLOSED'] },
          },
          _sum: { totalFee: true },
        }),
      ]);

    return {
      todayConsultations,
      upcoming,
      completed,
      totalEarnings: earnings._sum.totalFee || 0,
    };
  }

  async getConsultations(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');

    return this.prisma.booking.findMany({
      where: { providerId: profile.id },
      include: {
        patient: { include: { user: true } },
        serviceCategory: true,
        consultationSummary: true,
        videoSession: true,
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async getPatients(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');

    const bookings = await this.prisma.booking.findMany({
      where: { providerId: profile.id },
      include: {
        patient: { include: { user: true } },
        consultationSummary: true,
      },
      orderBy: { scheduledAt: 'desc' },
    });

    const patientMap = new Map<
      string,
      {
        id: string;
        name: string;
        phone: string;
        gender: string | null;
        dateOfBirth: Date | null;
        visitCount: number;
        lastVisit: Date;
        lastStatus: string;
        lastDiagnosis: string | null;
      }
    >();

    for (const booking of bookings) {
      const pid = booking.patient.id;
      if (!patientMap.has(pid)) {
        patientMap.set(pid, {
          id: pid,
          name: booking.patient.name,
          phone: booking.patient.user.phone,
          gender: booking.patient.gender ?? null,
          dateOfBirth: booking.patient.dateOfBirth ?? null,
          visitCount: 1,
          lastVisit: booking.scheduledAt,
          lastStatus: booking.status,
          lastDiagnosis: booking.consultationSummary?.diagnosis ?? null,
        });
      } else {
        patientMap.get(pid)!.visitCount++;
      }
    }

    return Array.from(patientMap.values());
  }

  async getPatientConsultations(userId: string, patientId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');

    const bookings = await this.prisma.booking.findMany({
      where: { providerId: profile.id, patientId },
      include: {
        patient: { include: { user: true } },
        serviceCategory: true,
        consultationSummary: { include: { prescriptions: true } },
        videoSession: true,
      },
      orderBy: { scheduledAt: 'desc' },
    });

    if (bookings.length === 0) {
      throw new NotFoundException(
        'Patient not found or not treated by this doctor',
      );
    }

    const patient = bookings[0].patient;
    return {
      id: patient.id,
      name: patient.name,
      phone: patient.user.phone,
      gender: patient.gender,
      dateOfBirth: patient.dateOfBirth,
      emergencyContact: patient.emergencyContact,
      visitCount: bookings.length,
      consultations: bookings.map((b) => ({
        id: b.id,
        scheduledAt: b.scheduledAt,
        status: b.status,
        mode: b.mode,
        symptoms: b.symptoms,
        totalFee: b.totalFee,
        serviceCategory: b.serviceCategory.name,
        videoSession: b.videoSession
          ? {
              id: b.videoSession.id,
              status: b.videoSession.status,
              roomId: b.videoSession.roomId,
            }
          : null,
        summary: b.consultationSummary
          ? {
              diagnosis: b.consultationSummary.diagnosis,
              observations: b.consultationSummary.observations,
              nextSteps: b.consultationSummary.nextSteps,
              followUp: b.consultationSummary.followUpRecommendation,
              prescriptions: b.consultationSummary.prescriptions,
            }
          : null,
      })),
    };
  }

  async getEarnings(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');

    const [totalAgg, pendingAgg, lastPayout] = await Promise.all([
      this.prisma.booking.aggregate({
        where: {
          providerId: profile.id,
          status: { in: ['COMPLETED', 'SUMMARY_SUBMITTED', 'CLOSED'] },
        },
        _sum: { totalFee: true },
      }),
      this.prisma.payout.aggregate({
        where: { providerId: profile.id, status: 'PENDING' },
        _sum: { amount: true },
      }),
      this.prisma.payout.findFirst({
        where: { providerId: profile.id, status: 'PROCESSED' },
        orderBy: { processedAt: 'desc' },
      }),
    ]);

    return {
      totalEarnings: totalAgg._sum.totalFee || 0,
      pendingPayout: pendingAgg._sum.amount || 0,
      lastPayout: lastPayout
        ? { amount: lastPayout.amount, date: lastPayout.processedAt }
        : null,
    };
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
    serviceId?: string,
  ) {
    const isVideoMode = mode === 'VIDEO_CONSULTATION';

    const providers = await this.prisma.providerProfile.findMany({
      where: {
        isAvailable: true,
        isActive: true,
        isVerified: true,
        // For video consultations location is irrelevant — skip the
        // lat/lng requirement so all available doctors are returned.
        ...(!isVideoMode && {
          currentLat: { not: null },
          currentLng: { not: null },
        }),
        ...((serviceCategory || serviceId) && {
          providerServices: {
            some: {
              serviceCategory: {
                ...(serviceId && { id: serviceId }),
                ...(serviceCategory && { slug: serviceCategory }),
              },
            },
          },
        }),
        ...(mode === 'HOME_VISIT' && { homeVisitEnabled: true }),
        ...(mode === 'DOCTOR_PLACE' && { doctorPlaceVisitEnabled: true }),
        ...(isVideoMode && { videoConsultationEnabled: true }),
      },
      include: {
        providerServices: { include: { serviceCategory: true } },
        user: true,
      },
    });

    if (isVideoMode) {
      // Return all video-capable providers without distance filtering,
      // sorted by fee (ascending).
      return providers
        .map((provider) => ({ ...provider, distance: 0 }))
        .sort(
          (a, b) =>
            a.consultationFeeVideoConsultation -
            b.consultationFeeVideoConsultation,
        );
    }

    const withDistance = providers
      .map((provider) => {
        if (!provider.currentLat || !provider.currentLng) return null;
        const distance = haversineDistance(
          lat,
          lng,
          provider.currentLat,
          provider.currentLng,
        );
        return { ...provider, distance };
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

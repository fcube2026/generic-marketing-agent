import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DiagnosticStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SupabaseSyncService } from '../../common/supabase/supabase-sync.service';
import { PrescriptionStorageService } from '../prescription/prescription-storage.service';
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
  constructor(
    private prisma: PrismaService,
    private readonly supabaseSync: SupabaseSyncService,
    private readonly prescriptionStorage: PrescriptionStorageService,
  ) {}

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

    // Apply safe defaults so every new provider is enabled for video consultation
    // and has a sensible fee even when the client omits these fields.
    const enrichedProfile = {
      ...profileData,
      videoConsultationEnabled: profileData.videoConsultationEnabled ?? true,
      consultationFeeVideoConsultation:
        profileData.consultationFeeVideoConsultation != null &&
        profileData.consultationFeeVideoConsultation > 0
          ? profileData.consultationFeeVideoConsultation
          : 500,
    };

    const profile = await this.prisma.providerProfile.create({
      data: {
        ...enrichedProfile,
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

    return this.prisma.providerProfile
      .findUnique({
        where: { id: profile.id },
        include: {
          providerServices: { include: { serviceCategory: true } },
          user: true,
        },
      })
      .then(async (full) => {
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

    await this.ensureProviderServiceLink(
      profile.id,
      profileData.specialization ?? profile.specialization ?? '',
    );

    return this.prisma.providerProfile
      .findUnique({
        where: { id: profile.id },
        include: { providerServices: { include: { serviceCategory: true } } },
      })
      .then(async (full) => {
        if (full) await this.supabaseSync.syncProvider(full);
        return full;
      });
  }

  async updateAvailability(userId: string, dto: UpdateProviderAvailabilityDto) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');

    return this.prisma.providerProfile
      .update({
        where: { userId },
        data: {
          isAvailable: dto.isAvailable,
          ...(dto.currentLat !== undefined && { currentLat: dto.currentLat }),
          ...(dto.currentLng !== undefined && { currentLng: dto.currentLng }),
          ...(dto.serviceRadius !== undefined && {
            serviceRadius: dto.serviceRadius,
          }),
        },
      })
      .then(async (updated) => {
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

  private mapBookingStatus(
    status: string,
  ): 'scheduled' | 'in_progress' | 'completed' | 'cancelled' {
    if (['COMPLETED', 'SUMMARY_SUBMITTED', 'CLOSED'].includes(status))
      return 'completed';
    if (status === 'IN_PROGRESS') return 'in_progress';
    if (['DECLINED', 'CANCELLED'].includes(status)) return 'cancelled';
    return 'scheduled';
  }

  private mapBookingToConsultation(
    booking: Prisma.BookingGetPayload<{
      include: {
        patient: true;
        consultationSummary: { include: { prescriptions: true } };
        diagnosticRequests: true;
      };
    }>,
  ) {
    const dob = booking.patient?.dateOfBirth as Date | null | undefined;
    const patientAge = dob
      ? Math.floor(
          (Date.now() - new Date(dob).getTime()) /
            (1000 * 60 * 60 * 24 * 365.25),
        )
      : undefined;
    return {
      id: booking.id,
      patientName: booking.patient?.name ?? 'Unknown',
      patientUHID: booking.patient?.id ?? null,
      patientAge,
      patientGender: booking.patient?.gender ?? null,
      scheduledAt: booking.scheduledAt,
      status: this.mapBookingStatus(booking.status),
      type: booking.mode,
      chiefComplaint:
        booking.consultationSummary?.symptoms ?? booking.symptoms ?? null,
      diagnosis: booking.consultationSummary?.diagnosis ?? null,
      prescription: booking.consultationSummary?.prescriptions ?? [],
      labReports: booking.diagnosticRequests ?? [],
    };
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

    const [
      todayConsultations,
      upcomingConsultations,
      inProgressConsultations,
      completedConsultations,
      earnings,
      totalPatients,
      pendingLabReports,
      recentBookingsRaw,
    ] = await Promise.all([
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
          status: 'IN_PROGRESS',
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
      this.prisma.booking
        .findMany({
          where: { providerId: profile.id },
          select: { patientId: true },
          distinct: ['patientId'],
        })
        .then((rows) => rows.length),
      this.prisma.diagnosticRequest.count({
        where: {
          booking: { providerId: profile.id },
          status: { notIn: [DiagnosticStatus.RESULTED] },
        },
      }),
      this.prisma.booking.findMany({
        where: { providerId: profile.id },
        include: {
          patient: true,
          consultationSummary: { include: { prescriptions: true } },
          diagnosticRequests: true,
        },
        orderBy: { scheduledAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      todayConsultations,
      upcomingConsultations,
      inProgressConsultations,
      completedConsultations,
      totalEarnings: earnings._sum.totalFee || 0,
      totalPatients,
      pendingLabReports,
      recentConsultations: recentBookingsRaw.map((b) =>
        this.mapBookingToConsultation(b),
      ),
    };
  }

  async getConsultations(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');

    const bookings = await this.prisma.booking.findMany({
      where: { providerId: profile.id },
      include: {
        patient: true,
        consultationSummary: { include: { prescriptions: true } },
        diagnosticRequests: true,
      },
      orderBy: { scheduledAt: 'desc' },
    });

    return {
      consultations: bookings.map((b) => this.mapBookingToConsultation(b)),
    };
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
      },
      orderBy: { scheduledAt: 'desc' },
    });

    if (bookings.length === 0) {
      throw new NotFoundException(
        'Patient not found or not treated by this doctor',
      );
    }

    const patient = bookings[0].patient;
    const consultations = await Promise.all(
      bookings.map(async (b) => ({
        id: b.id,
        scheduledAt: b.scheduledAt,
        status: b.status,
        mode: b.mode,
        symptoms: b.symptoms,
        totalFee: b.totalFee,
        serviceCategory: b.serviceCategory.name,
        summary: b.consultationSummary
          ? {
              diagnosis: b.consultationSummary.diagnosis,
              observations: b.consultationSummary.observations,
              nextSteps: b.consultationSummary.nextSteps,
              followUp: b.consultationSummary.followUpRecommendation,
              prescriptions: await Promise.all(
                b.consultationSummary.prescriptions.map(
                  async (prescription) => ({
                    ...prescription,
                    fileUrl: await this.prescriptionStorage.resolveReadUrl(
                      prescription.fileUrl,
                    ),
                  }),
                ),
              ),
            }
          : null,
      })),
    );

    return {
      id: patient.id,
      name: patient.name,
      phone: patient.user.phone,
      gender: patient.gender,
      dateOfBirth: patient.dateOfBirth,
      emergencyContact: patient.emergencyContact,
      visitCount: bookings.length,
      consultations,
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

  async getActiveVideoConsultations(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');

    return this.prisma.booking.findMany({
      where: {
        providerId: profile.id,
        mode: 'VIDEO_CONSULTATION',
        status: { in: ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS'] },
      },
      include: {
        patient: true,
        serviceCategory: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async getNearbyProviders(
    lat: number | null,
    lng: number | null,
    serviceCategory?: string,
    mode?: string,
    serviceId?: string,
  ) {
    const normalizedCategorySlug = serviceCategory
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const categoryLabel = normalizedCategorySlug?.replace(/-/g, ' ');
    const shouldApplyCategoryFilter =
      (normalizedCategorySlug && normalizedCategorySlug !== 'doctor') ||
      !!serviceId;

    const isVideoMode = mode === 'VIDEO_CONSULTATION';

    const providers = await this.prisma.providerProfile.findMany({
      where: {
        isAvailable: true,
        isActive: true,
        isVerified: true,
        ...(!isVideoMode && {
          currentLat: { not: null },
          currentLng: { not: null },
        }),
        ...(shouldApplyCategoryFilter && {
          OR: [
            ...(serviceId
              ? [
                  {
                    providerServices: {
                      some: { serviceCategory: { id: serviceId } },
                    },
                  },
                ]
              : []),
            ...(normalizedCategorySlug && normalizedCategorySlug !== 'doctor'
              ? [
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
                      mode: 'insensitive' as const,
                    },
                  },
                  {
                    specialization: {
                      contains: categoryLabel,
                      mode: 'insensitive' as const,
                    },
                  },
                ]
              : []),
          ],
        }),
        ...(mode === 'HOME_VISIT' && { homeVisitEnabled: true }),
        ...(mode === 'DOCTOR_PLACE' && { doctorPlaceVisitEnabled: true }),
      },
      include: {
        providerServices: { include: { serviceCategory: true } },
        user: true,
        bookings: {
          where: {
            status: {
              in: ['ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'],
            },
          },
          select: { id: true },
          take: 1,
        },
      },
    });

    const results = providers.map((p) => {
      const isOccupied = p.bookings.length > 0;
      // Remove bookings from the response object to keep it clean
      const { bookings: _bookings, ...profile } = p;

      if (isVideoMode) {
        return { ...profile, distance: 0, isOccupied };
      }

      if (profile.currentLat == null || profile.currentLng == null) return null;

      const distance = haversineDistance(
        lat,
        lng,
        profile.currentLat,
        profile.currentLng,
      );

      const effectiveServiceRadius =
        typeof profile.serviceRadius === 'number' && profile.serviceRadius > 0
          ? profile.serviceRadius
          : 10;

      if (distance > effectiveServiceRadius) return null;

      return { ...profile, distance, isOccupied };
    });

    return results
      .filter(
        (provider): provider is NonNullable<typeof provider> =>
          provider !== null,
      )
      .sort((a, b) => {
        // Sort by availability first, then distance
        if (a.isOccupied !== b.isOccupied) {
          return a.isOccupied ? 1 : -1;
        }
        return a.distance - b.distance;
      });
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

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Mirrors core Prisma writes (patients, providers, bookings, video sessions)
 * to the Supabase Postgres tables defined in supabase/migrations/.
 *
 * - All operations are best-effort: errors are logged but never thrown so
 *   they cannot break the primary API request.
 * - Records are upserted by `source_id` (the Prisma cuid).
 */
@Injectable()
export class SupabaseSyncService {
  private readonly logger = new Logger(SupabaseSyncService.name);
  private readonly client: SupabaseClient | null;
  private readonly enabled: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const url = this.config.get<string>('SUPABASE_URL', '');
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY', '');
    if (!url || !key) {
      this.logger.warn(
        'SupabaseSyncService disabled: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set.',
      );
      this.client = null;
      this.enabled = false;
      return;
    }
    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this.enabled = true;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // ------------------------------------------------------------------ patients
  async syncPatient(patient: {
    id: string;
    userId: string;
    phone?: string | null;
    name?: string | null;
    email?: string | null;
    dateOfBirth?: Date | string | null;
    gender?: string | null;
    emergencyContact?: string | null;
  }): Promise<void> {
    if (!this.enabled || !this.client) return;
    const phone = patient.phone ?? (await this.lookupUserPhone(patient.userId));
    const row = {
      source_id: patient.id,
      user_id: patient.userId,
      phone: phone ?? `unknown-${patient.userId}`,
      name: patient.name ?? '',
      email: patient.email ?? null,
      date_of_birth:
        patient.dateOfBirth instanceof Date
          ? patient.dateOfBirth.toISOString().slice(0, 10)
          : (patient.dateOfBirth ?? null),
      gender: patient.gender ?? null,
      emergency_contact: patient.emergencyContact ?? null,
    };
    const { error } = await this.client
      .from('patients')
      .upsert(row, { onConflict: 'source_id' });
    if (error) {
      this.logger.warn(
        `syncPatient(${patient.id}) failed: [${error.code}] ${error.message}${
          error.details ? ` - ${error.details}` : ''
        }`,
      );
    }
  }

  // ----------------------------------------------------------------- providers
  async syncProvider(provider: {
    id: string;
    userId: string;
    phone?: string | null;
    name?: string | null;
    email?: string | null;
    specialization?: string | null;
    licenseNumber?: string | null;
    bio?: string | null;
    isVerified?: boolean;
    isAvailable?: boolean;
    homeVisitEnabled?: boolean;
    doctorPlaceVisitEnabled?: boolean;
    videoConsultationEnabled?: boolean;
    consultationFeeHomeVisit?: number;
    consultationFeeDoctorPlace?: number;
    consultationFeeVideoConsultation?: number;
    currentLat?: number | null;
    currentLng?: number | null;
    serviceRadius?: number;
  }): Promise<void> {
    if (!this.enabled || !this.client) return;
    const phone =
      provider.phone ?? (await this.lookupUserPhone(provider.userId));
    const row = {
      source_id: provider.id,
      user_id: provider.userId,
      phone: phone ?? `unknown-${provider.userId}`,
      name: provider.name ?? '',
      email: provider.email ?? null,
      specialization: provider.specialization ?? null,
      license_number: provider.licenseNumber ?? null,
      bio: provider.bio ?? null,
      verification_status: provider.isVerified ? 'verified' : 'pending',
      is_available: !!provider.isAvailable,
      home_visit_enabled: !!provider.homeVisitEnabled,
      doctor_place_visit_enabled: !!provider.doctorPlaceVisitEnabled,
      video_consultation_enabled: !!provider.videoConsultationEnabled,
      consultation_fee_home_visit: provider.consultationFeeHomeVisit ?? 0,
      consultation_fee_doctor_place: provider.consultationFeeDoctorPlace ?? 0,
      consultation_fee_video: provider.consultationFeeVideoConsultation ?? 0,
      current_lat: provider.currentLat ?? null,
      current_lng: provider.currentLng ?? null,
      service_radius: provider.serviceRadius ?? 10,
    };
    const { error } = await this.client
      .from('providers')
      .upsert(row, { onConflict: 'source_id' });
    if (error) {
      this.logger.warn(
        `syncProvider(${provider.id}) failed: [${error.code}] ${error.message}${
          error.details ? ` - ${error.details}` : ''
        }`,
      );
    }
  }

  // ------------------------------------------------------------------ bookings
  async syncBooking(booking: {
    id: string;
    patientId: string;
    providerId: string;
    serviceCategoryId?: string | null;
    mode: string;
    status: string;
    scheduledAt: Date | string;
    symptoms?: string | null;
    totalFee: number;
    paymentStatus: string;
  }): Promise<void> {
    if (!this.enabled || !this.client) return;
    const row = {
      source_id: booking.id,
      patient_source_id: booking.patientId,
      provider_source_id: booking.providerId,
      mode: booking.mode,
      status: booking.status,
      scheduled_at:
        booking.scheduledAt instanceof Date
          ? booking.scheduledAt.toISOString()
          : booking.scheduledAt,
      symptoms: booking.symptoms ?? null,
      total_fee: booking.totalFee,
      payment_status: booking.paymentStatus,
    };
    const { error } = await this.client
      .from('bookings')
      .upsert(row, { onConflict: 'source_id' });
    if (error) {
      this.logger.warn(
        `syncBooking(${booking.id}) failed: [${error.code}] ${error.message}${
          error.details ? ` - ${error.details}` : ''
        }`,
      );
    }
  }

  // ------------------------------------------------------------- video session
  async syncVideoSession(session: {
    id: string;
    bookingId?: string | null;
    roomId: string;
    sessionToken?: string | null;
    status: string;
    startedAt?: Date | null;
    endedAt?: Date | null;
    duration?: number | null;
    creatorUserId?: string | null;
  }): Promise<void> {
    if (!this.enabled || !this.client) return;
    const row = {
      source_id: session.id,
      booking_source_id: session.bookingId ?? null,
      room_id: session.roomId,
      session_token: session.sessionToken ?? null,
      status: session.status,
      started_at: session.startedAt ? session.startedAt.toISOString() : null,
      ended_at: session.endedAt ? session.endedAt.toISOString() : null,
      duration: session.duration ?? null,
      creator_user_id: session.creatorUserId ?? null,
    };
    const { error } = await this.client
      .from('video_sessions')
      .upsert(row, { onConflict: 'source_id' });
    if (error) {
      this.logger.warn(
        `syncVideoSession(${session.id}) failed: [${error.code}] ${error.message}${
          error.details ? ` - ${error.details}` : ''
        }`,
      );
    }
  }

  async backfillCoreData(): Promise<{
    patients: number;
    providers: number;
    bookings: number;
    videoSessions: number;
  }> {
    if (!this.enabled || !this.client) {
      throw new Error(
        'SupabaseSyncService is disabled: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.',
      );
    }

    const [patients, providers, bookings, videoSessions] = await Promise.all([
      this.prisma.patientProfile.findMany({
        include: { user: { select: { phone: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.providerProfile.findMany({
        include: { user: { select: { phone: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.booking.findMany({ orderBy: { createdAt: 'asc' } }),
      this.prisma.videoSession.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);

    for (const patient of patients) {
      await this.syncPatient({
        id: patient.id,
        userId: patient.userId,
        phone: patient.user.phone,
        name: patient.name,
        email: patient.user.email,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        emergencyContact: patient.emergencyContact,
      });
    }

    for (const provider of providers) {
      await this.syncProvider({
        id: provider.id,
        userId: provider.userId,
        phone: provider.user.phone,
        name: provider.name,
        email: provider.user.email,
        specialization: provider.specialization,
        licenseNumber: provider.licenseNumber,
        bio: provider.bio,
        isVerified: provider.isVerified,
        isAvailable: provider.isAvailable,
        homeVisitEnabled: provider.homeVisitEnabled,
        doctorPlaceVisitEnabled: provider.doctorPlaceVisitEnabled,
        videoConsultationEnabled: provider.videoConsultationEnabled,
        consultationFeeHomeVisit: provider.consultationFeeHomeVisit,
        consultationFeeDoctorPlace: provider.consultationFeeDoctorPlace,
        consultationFeeVideoConsultation:
          provider.consultationFeeVideoConsultation,
        currentLat: provider.currentLat,
        currentLng: provider.currentLng,
        serviceRadius: provider.serviceRadius,
      });
    }

    for (const booking of bookings) {
      await this.syncBooking(booking);
    }

    for (const session of videoSessions) {
      await this.syncVideoSession(session);
    }

    return {
      patients: patients.length,
      providers: providers.length,
      bookings: bookings.length,
      videoSessions: videoSessions.length,
    };
  }

  // ----------------------------------------------------------------- internal
  private async lookupUserPhone(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    if (user?.phone) return user.phone;

    if (!this.client) return null;
    // Best-effort phone lookup via existing patients/providers row by user_id.
    const { data } = await this.client
      .from('patients')
      .select('phone')
      .eq('user_id', userId)
      .maybeSingle();
    if (data?.phone) return data.phone as string;
    const { data: d2 } = await this.client
      .from('providers')
      .select('phone')
      .eq('user_id', userId)
      .maybeSingle();
    return (d2?.phone as string) ?? null;
  }
}

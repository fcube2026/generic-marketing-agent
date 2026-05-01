import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SupabaseSyncService } from '../../common/supabase/supabase-sync.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { BookingStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PatientVerificationService } from '../patient-verification/patient-verification.service';
import { ConfigService } from '@nestjs/config';

const BOOKING_CONFLICT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const CONSULTATION_DURATION_MS = 15 * 60 * 1000; // default slot = 15 minutes

// Statuses that represent an active/in-progress patient booking for conflict detection.
const PATIENT_ACTIVE_STATUSES = [
  'REQUESTED',
  'ACCEPTED',
  'IN_PROGRESS',
] as const;

const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  REQUESTED: ['ACCEPTED', 'DECLINED', 'CANCELLED'],
  ACCEPTED: ['ON_THE_WAY', 'CANCELLED'],
  DECLINED: [],
  ON_THE_WAY: ['ARRIVED'],
  ARRIVED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: ['SUMMARY_SUBMITTED'],
  SUMMARY_SUBMITTED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
};

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private patientVerificationService: PatientVerificationService,
    private config: ConfigService,
    private readonly supabaseSync: SupabaseSyncService,
  ) {}

  private formatScheduledTime(date: Date): string {
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private buildPatientUniqueId(patientId: string): string {
    return `PT-${patientId.slice(-8).toUpperCase()}`;
  }

  async createBooking(userId: string, dto: CreateBookingDto) {
    const patientProfile = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });
    if (!patientProfile)
      throw new NotFoundException(
        'Patient profile not found. Please complete your profile first.',
      );

    // KYC gate: when PATIENT_VERIFICATION_REQUIRED=true, block booking
    // creation unless the patient's KYC is CONFIRMED (or has an admin
    // emergency override). Defaults to false in staging so the rest of the
    // booking flow remains testable while the verification pipeline is
    // being completed.
    const kycRequired =
      String(
        this.config.get('PATIENT_VERIFICATION_REQUIRED', 'false'),
      ).toLowerCase() === 'true';
    if (kycRequired) {
      const verified = await this.patientVerificationService.isPatientVerified(
        patientProfile.id,
      );
      if (!verified) {
        throw new ForbiddenException(
          'VERIFICATION_REQUIRED: Please complete identity verification (KYC) from your Profile before booking.',
        );
      }
    }

    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: dto.providerId },
    });
    if (!provider) throw new NotFoundException('Provider not found');

    // Validate provider is available
    if (!provider.isAvailable) {
      throw new BadRequestException('Provider is not currently available.');
    }

    // Validate booking mode is supported by provider
    if (dto.mode === 'HOME_VISIT' && !provider.homeVisitEnabled) {
      throw new BadRequestException(
        'This provider does not offer home visits.',
      );
    }
    if (dto.mode === 'DOCTOR_PLACE' && !provider.doctorPlaceVisitEnabled) {
      throw new BadRequestException(
        'This provider does not offer clinic visits.',
      );
    }

    // Validate address is provided for home visits
    if (dto.mode === 'HOME_VISIT' && !dto.addressId) {
      throw new BadRequestException(
        'Address is required for home visit bookings.',
      );
    }

    // Validate address exists and belongs to user if provided
    if (dto.addressId) {
      const address = await this.prisma.address.findFirst({
        where: { id: dto.addressId, userId },
      });
      if (!address) {
        throw new NotFoundException(
          'Address not found or does not belong to you.',
        );
      }
    }

    // Check for scheduling conflicts (overlapping active bookings for same provider)
    const scheduledAt = new Date(dto.scheduledAt);
    const windowStart = new Date(
      scheduledAt.getTime() - BOOKING_CONFLICT_WINDOW_MS,
    );
    const windowEnd = new Date(
      scheduledAt.getTime() + BOOKING_CONFLICT_WINDOW_MS,
    );

    const conflictingBooking = await this.prisma.booking.findFirst({
      where: {
        providerId: dto.providerId,
        status: {
          in: ['REQUESTED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'],
        },
        scheduledAt: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
    });

    if (conflictingBooking) {
      throw new BadRequestException(
        'Provider has a conflicting booking at the requested time. Please choose a different time.',
      );
    }

    // Check for patient-side scheduling conflicts: block if the patient already
    // has an active booking whose time window overlaps with the new booking.
    // Assuming each consultation is CONSULTATION_DURATION_MS long:
    //   overlap exists when: existingStart < newEnd  AND  existingEnd > newStart
    //   => existingStart < (scheduledAt + DURATION)
    //   => existingStart >= (scheduledAt - DURATION)   (existingEnd > scheduledAt)
    const newBookingEnd = new Date(
      scheduledAt.getTime() + CONSULTATION_DURATION_MS,
    );
    const patientConflict = await this.prisma.booking.findFirst({
      where: {
        patientId: patientProfile.id,
        status: { in: [...PATIENT_ACTIVE_STATUSES] },
        scheduledAt: {
          gte: new Date(scheduledAt.getTime() - CONSULTATION_DURATION_MS),
          lt: newBookingEnd,
        },
      },
    });

    if (patientConflict) {
      throw new BadRequestException(
        'You already have a consultation at this time. Please choose a different time.',
      );
    }

    const fee =
      dto.mode === 'HOME_VISIT'
        ? provider.consultationFeeHomeVisit
        : dto.mode === 'VIDEO_CONSULTATION'
          ? provider.consultationFeeVideoConsultation
          : provider.consultationFeeDoctorPlace;

    const booking = await this.prisma.booking.create({
      data: {
        patientId: patientProfile.id,
        providerId: dto.providerId,
        serviceCategoryId: dto.serviceCategoryId,
        addressId: dto.addressId,
        mode: dto.mode,
        scheduledAt: new Date(dto.scheduledAt),
        symptoms: dto.symptoms,
        totalFee: fee,
        status: 'REQUESTED',
        paymentStatus: 'PENDING',
      },
      include: {
        provider: true,
        serviceCategory: true,
        address: true,
      },
    });

    await this.prisma.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        status: 'REQUESTED',
        changedBy: userId,
      },
    });

    await this.prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: fee,
        status: 'PENDING',
      },
    });

    // Mirror to Supabase (best-effort). Sync FK-side rows first so the
    // booking row's source mappings have a counterpart.
    await this.supabaseSync.syncPatient(patientProfile);
    await this.supabaseSync.syncProvider(provider);
    await this.supabaseSync.syncBooking(booking);

    // Notify provider of new booking request with push and SMS
    const modeText =
      dto.mode === 'HOME_VISIT'
        ? 'home visit'
        : dto.mode === 'VIDEO_CONSULTATION'
          ? 'video consultation'
          : 'clinic visit';
    await this.notificationsService.sendNotification(
      {
        userId: provider.userId,
        title: 'New Booking Request',
        message: `You have a new ${modeText} booking request for ${this.formatScheduledTime(scheduledAt)}.`,
        type: 'BOOKING_REQUEST',
        metadata: { bookingId: booking.id },
      },
      {
        inApp: true,
        push: true,
        sms: true,
        smsTemplate: 'NEW_BOOKING_REQUEST',
        smsParams: {
          mode: modeText,
          patientName: patientProfile.name,
          scheduledTime: this.formatScheduledTime(scheduledAt),
        },
      },
    );

    return booking;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getBooking(bookingId: string, _userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        patient: true,
        provider: { include: { user: true } },
        serviceCategory: true,
        address: true,
        statusHistory: { orderBy: { changedAt: 'asc' } },
        consultationSummary: { include: { prescriptions: true } },
        diagnosticRequests: { include: { labResults: true } },
        referrals: true,
        payment: true,
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    return {
      ...booking,
      patient: {
        ...booking.patient,
        uniquePatientId: this.buildPatientUniqueId(booking.patient.id),
      },
    };
  }

  async updateBookingStatus(
    bookingId: string,
    userId: string,
    dto: UpdateBookingStatusDto,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const validNext = VALID_TRANSITIONS[booking.status];
    if (!validNext.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${booking.status} to ${dto.status}`,
      );
    }

    if (dto.status === 'SUMMARY_SUBMITTED') {
      const summary = await this.prisma.consultationSummary.findUnique({
        where: { bookingId },
      });
      if (!summary) {
        throw new BadRequestException(
          'Cannot transition to SUMMARY_SUBMITTED without a consultation summary. Use the consultation summary endpoint.',
        );
      }
    }

    if (dto.status === 'CLOSED') {
      const summary = await this.prisma.consultationSummary.findUnique({
        where: { bookingId },
      });
      if (!summary) {
        throw new BadRequestException(
          'Cannot close booking without a consultation summary.',
        );
      }
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: dto.status },
    });

    // Fire-and-forget: do not block on Supabase sync; a slow or unavailable
    // Supabase instance must never delay the status-update response to the client.
    void this.supabaseSync.syncBooking(updated).catch((err) => {
      // eslint-disable-next-line no-console
      console.error(
        `[bookings] supabase sync failed for booking=${bookingId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    });

    await this.prisma.bookingStatusHistory.create({
      data: {
        bookingId,
        status: dto.status,
        changedBy: userId,
      },
    });

    // Send notifications for provider-driven status transitions
    const fullBooking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { patient: true, provider: true },
    });

    if (fullBooking && fullBooking.provider?.name) {
      const providerName = fullBooking.provider.name;
      const PROVIDER_TRANSITION_CONFIG: Partial<
        Record<
          BookingStatus,
          {
            title: string;
            message: string;
            smsTemplate?: string;
            sendSms: boolean;
          }
        >
      > = {
        ON_THE_WAY: {
          title: 'Provider On the Way',
          message: `Dr. ${providerName} is on the way to your location.`,
          smsTemplate: 'PROVIDER_ON_THE_WAY',
          sendSms: true,
        },
        ARRIVED: {
          title: 'Provider Arrived',
          message: `Dr. ${providerName} has arrived.`,
          smsTemplate: 'PROVIDER_ARRIVED',
          sendSms: true,
        },
        IN_PROGRESS: {
          title: 'Consultation Started',
          message: 'Your consultation is now in progress.',
          sendSms: false,
        },
        COMPLETED: {
          title: 'Consultation Completed',
          message: `Your consultation with Dr. ${providerName} has been completed.`,
          smsTemplate: 'CONSULTATION_COMPLETED',
          sendSms: true,
        },
      };

      const config = PROVIDER_TRANSITION_CONFIG[dto.status];
      if (config) {
        // Fire-and-forget: do not block the status update on slow downstream
        // providers (WhatsApp / SMS / Push). Mobile clients have a 30s axios
        // timeout, and synchronous awaits here have caused PUT /bookings/:id/status
        // to appear as "Network Error" to the provider app.
        void this.notificationsService
          .sendNotification(
            {
              userId: fullBooking.patient.userId,
              title: config.title,
              message: config.message,
              type: 'BOOKING_STATUS_UPDATE',
              metadata: { bookingId, status: dto.status },
            },
            {
              inApp: true,
              push: true,
              sms: config.sendSms,
              smsTemplate: config.smsTemplate,
              smsParams: {
                providerName,
              },
            },
          )
          .catch((err) => {
            // Swallow notification errors so they never bubble up; log for ops.
            // eslint-disable-next-line no-console
            console.error(
              `[bookings] notification dispatch failed for booking=${bookingId} status=${dto.status}: ${err instanceof Error ? err.message : String(err)}`,
            );
          });
      }
    }

    return updated;
  }

  private async assertBookingProvider(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { provider: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.provider?.userId !== userId) {
      throw new ForbiddenException(
        'Only the assigned provider can perform this action',
      );
    }
  }

  async acceptBooking(bookingId: string, userId: string) {
    await this.assertBookingProvider(bookingId, userId);

    const updated = await this.updateBookingStatus(bookingId, userId, {
      status: BookingStatus.ACCEPTED,
    });

    // Fire-and-forget: notify patient that booking was accepted. Awaiting slow
    // downstream providers (SMS/Push) here previously caused the Accept button
    // to stay in "Updating…" state for 2-5 seconds.
    void this.prisma.booking
      .findUnique({
        where: { id: bookingId },
        include: { patient: true, provider: true },
      })
      .then((booking) => {
        if (!booking) return;
        return this.notificationsService.sendNotification(
          {
            userId: booking.patient.userId,
            title: 'Booking Accepted',
            message: `Your booking has been accepted by Dr. ${booking.provider.name}.`,
            type: 'BOOKING_ACCEPTED',
            metadata: { bookingId },
          },
          {
            inApp: true,
            push: true,
            sms: true,
            smsTemplate: 'BOOKING_ACCEPTED',
            smsParams: {
              providerName: booking.provider.name,
              scheduledTime: this.formatScheduledTime(booking.scheduledAt),
            },
          },
        );
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error(
          `[bookings] accept notification failed for booking=${bookingId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });

    return updated;
  }

  async declineBooking(bookingId: string, userId: string, reason?: string) {
    await this.assertBookingProvider(bookingId, userId);

    const updated = await this.updateBookingStatus(bookingId, userId, {
      status: BookingStatus.DECLINED,
    });

    // Fire-and-forget: notify patient that booking was declined.
    void this.prisma.booking
      .findUnique({
        where: { id: bookingId },
        include: { patient: true, provider: true },
      })
      .then((booking) => {
        if (!booking) return;
        return this.notificationsService.sendNotification(
          {
            userId: booking.patient.userId,
            title: 'Booking Declined',
            message: reason
              ? `Your booking was declined by Dr. ${booking.provider.name}. Reason: ${reason}`
              : `Your booking was declined by Dr. ${booking.provider.name}.`,
            type: 'BOOKING_DECLINED',
            metadata: { bookingId, reason },
          },
          {
            inApp: true,
            push: true,
            sms: true,
            smsTemplate: 'BOOKING_DECLINED',
            smsParams: {
              reason: reason || '',
            },
          },
        );
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error(
          `[bookings] decline notification failed for booking=${bookingId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });

    return updated;
  }

  async cancelBooking(bookingId: string, userId: string) {
    const updated = await this.updateBookingStatus(bookingId, userId, {
      status: BookingStatus.CANCELLED,
    });

    // Fire-and-forget: notify the other party about cancellation and handle
    // refunds. Awaiting slow downstream providers (SMS/Push) previously added
    // 2-5 seconds to the cancel response time.
    void this.prisma.booking
      .findUnique({
        where: { id: bookingId },
        include: { patient: true, provider: true, payment: true },
      })
      .then(async (booking) => {
        if (!booking) return;
        const isPatientCancelling = booking.patient.userId === userId;
        const notifyUserId = isPatientCancelling
          ? booking.provider.userId
          : booking.patient.userId;
        const cancelledBy = isPatientCancelling
          ? 'the patient'
          : 'the provider';

        await this.notificationsService.sendNotification(
          {
            userId: notifyUserId,
            title: 'Booking Cancelled',
            message: `A booking has been cancelled by ${cancelledBy}.`,
            type: 'BOOKING_CANCELLED',
            metadata: { bookingId },
          },
          {
            inApp: true,
            push: true,
            sms: true,
            smsTemplate: isPatientCancelling
              ? 'BOOKING_CANCELLED_BY_PATIENT'
              : 'BOOKING_DECLINED',
            smsParams: {
              patientName: booking.patient.name,
              scheduledTime: this.formatScheduledTime(booking.scheduledAt),
            },
          },
        );

        // Trigger mock refund if payment was completed
        if (booking.payment && booking.payment.status === 'PAID') {
          await this.prisma.payment.update({
            where: { id: booking.payment.id },
            data: { status: 'REFUNDED' },
          });
          await this.prisma.booking.update({
            where: { id: bookingId },
            data: { paymentStatus: 'REFUNDED' },
          });

          // Notify patient about refund
          if (!isPatientCancelling) {
            await this.notificationsService.sendNotification(
              {
                userId: booking.patient.userId,
                title: 'Refund Processed',
                message: `A refund of ₹${booking.totalFee} has been processed for your cancelled booking.`,
                type: 'PAYMENT_REFUNDED',
                metadata: { bookingId, amount: booking.totalFee },
              },
              {
                inApp: true,
                push: true,
                sms: true,
                smsTemplate: 'REFUND_PROCESSED',
                smsParams: { amount: String(booking.totalFee) },
              },
            );
          }
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error(
          `[bookings] cancel notification/refund failed for booking=${bookingId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });

    return updated;
  }
}

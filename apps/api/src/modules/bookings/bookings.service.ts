import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { BookingStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

const BOOKING_CONFLICT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

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
  ) {}

  async createBooking(userId: string, dto: CreateBookingDto) {
    const patientProfile = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });
    if (!patientProfile)
      throw new NotFoundException(
        'Patient profile not found. Please complete your profile first.',
      );

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
    const windowStart = new Date(scheduledAt.getTime() - BOOKING_CONFLICT_WINDOW_MS);
    const windowEnd = new Date(scheduledAt.getTime() + BOOKING_CONFLICT_WINDOW_MS);

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

    const fee =
      dto.mode === 'HOME_VISIT'
        ? provider.consultationFeeHomeVisit
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

    // Notify provider of new booking request
    await this.notificationsService.createNotification({
      userId: provider.userId,
      title: 'New Booking Request',
      message: `You have a new ${dto.mode === 'HOME_VISIT' ? 'home visit' : 'clinic visit'} booking request.`,
      type: 'BOOKING_REQUEST',
      metadata: { bookingId: booking.id },
    });

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
    return booking;
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

    await this.prisma.bookingStatusHistory.create({
      data: {
        bookingId,
        status: dto.status,
        changedBy: userId,
      },
    });

    return updated;
  }

  async acceptBooking(bookingId: string, userId: string) {
    const updated = await this.updateBookingStatus(bookingId, userId, {
      status: BookingStatus.ACCEPTED,
    });

    // Notify patient that booking was accepted
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { patient: true, provider: true },
    });
    if (booking) {
      await this.notificationsService.createNotification({
        userId: booking.patient.userId,
        title: 'Booking Accepted',
        message: `Your booking has been accepted by ${booking.provider.name}.`,
        type: 'BOOKING_ACCEPTED',
        metadata: { bookingId },
      });
    }

    return updated;
  }

  async declineBooking(bookingId: string, userId: string, reason?: string) {
    const updated = await this.updateBookingStatus(bookingId, userId, {
      status: BookingStatus.DECLINED,
    });

    // Notify patient that booking was declined
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { patient: true, provider: true },
    });
    if (booking) {
      await this.notificationsService.createNotification({
        userId: booking.patient.userId,
        title: 'Booking Declined',
        message: reason
          ? `Your booking was declined by ${booking.provider.name}. Reason: ${reason}`
          : `Your booking was declined by ${booking.provider.name}.`,
        type: 'BOOKING_DECLINED',
        metadata: { bookingId, reason },
      });
    }

    return updated;
  }

  async cancelBooking(bookingId: string, userId: string) {
    return this.updateBookingStatus(bookingId, userId, {
      status: BookingStatus.CANCELLED,
    });
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { BookingStatus } from '@prisma/client';

const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  REQUESTED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['ON_THE_WAY', 'CANCELLED'],
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
  constructor(private prisma: PrismaService) {}

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
    return this.updateBookingStatus(bookingId, userId, {
      status: BookingStatus.ACCEPTED,
    });
  }

  async cancelBooking(bookingId: string, userId: string) {
    return this.updateBookingStatus(bookingId, userId, {
      status: BookingStatus.CANCELLED,
    });
  }
}

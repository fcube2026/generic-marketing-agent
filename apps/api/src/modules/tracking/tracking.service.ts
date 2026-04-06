import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateProviderLocationDto } from './dto/update-provider-location.dto';

/** Booking statuses during which provider location tracking is active. */
const TRACKABLE_STATUSES = ['ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'];

@Injectable()
export class TrackingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Provider pushes their current location for an active booking.
   * Only the assigned provider may update, and only while the booking
   * is in a trackable status.
   */
  async updateLocation(userId: string, dto: UpdateProviderLocationDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { provider: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.provider.userId !== userId) {
      throw new ForbiddenException(
        'Only the assigned provider can share location for this booking',
      );
    }

    if (!TRACKABLE_STATUSES.includes(booking.status)) {
      throw new ForbiddenException(
        'Location sharing is only available for active bookings',
      );
    }

    return this.prisma.providerLocation.create({
      data: {
        bookingId: dto.bookingId,
        lat: dto.lat,
        lng: dto.lng,
      },
    });
  }

  /**
   * Patient fetches the latest provider location for their booking.
   * Only the patient who owns the booking may read the location.
   */
  async getProviderLocation(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { patient: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.patient.userId !== userId) {
      throw new ForbiddenException(
        'Only the booking patient can view provider location',
      );
    }

    const location = await this.prisma.providerLocation.findFirst({
      where: { bookingId },
      orderBy: { recordedAt: 'desc' },
    });

    if (!location) {
      return { lat: null, lng: null, recordedAt: null };
    }

    return {
      lat: location.lat,
      lng: location.lng,
      recordedAt: location.recordedAt,
    };
  }
}

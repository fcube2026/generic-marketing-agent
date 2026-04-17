import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class VideoSessionsService {
  constructor(private prisma: PrismaService) {}

  async getSession(bookingId: string) {
    const session = await this.prisma.videoSession.findUnique({
      where: { bookingId },
    });
    if (!session) throw new NotFoundException('Video session not found');
    return session;
  }

  async startSession(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { provider: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.provider.userId !== userId) {
      throw new ForbiddenException(
        'Only the assigned provider can start a video session',
      );
    }

    const roomId = `curex24-${bookingId}`;

    return this.prisma.videoSession.upsert({
      where: { bookingId },
      create: {
        bookingId,
        roomId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
      update: {
        roomId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });
  }

  async startInstantSession(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { provider: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.provider.userId !== userId) {
      throw new ForbiddenException(
        'Only the assigned provider can start a video session',
      );
    }

    const roomId = `curex24-instant-${bookingId}-${Date.now()}`;

    return this.prisma.videoSession.upsert({
      where: { bookingId },
      create: {
        bookingId,
        roomId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
      update: {
        roomId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });
  }

  async endSession(bookingId: string, userId: string) {
    const session = await this.prisma.videoSession.findUnique({
      where: { bookingId },
    });
    if (!session) throw new NotFoundException('Video session not found');

    const booking = await this.prisma.booking.findUnique({
      where: { id: session.bookingId },
      include: { provider: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.provider.userId !== userId) {
      throw new ForbiddenException(
        'Only the assigned provider can end a video session',
      );
    }

    const endedAt = new Date();
    const duration = session.startedAt
      ? Math.round((endedAt.getTime() - session.startedAt.getTime()) / 1000)
      : 0;

    return this.prisma.videoSession.update({
      where: { bookingId },
      data: {
        status: 'COMPLETED',
        endedAt,
        duration,
      },
    });
  }
}

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
    return this.upsertActiveSession(bookingId, userId, `curex24-${bookingId}`);
  }

  async startInstantSession(bookingId: string, userId: string) {
    return this.upsertActiveSession(
      bookingId,
      userId,
      `curex24-instant-${bookingId}-${Date.now()}`,
    );
  }

  async createInstantSession(userId: string) {
    const roomId = `curex24-instant-${Date.now()}`;
    return this.prisma.videoSession.create({
      data: {
        roomId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        creatorUserId: userId,
      },
    });
  }

  async getSessionsForPatient(userId: string) {
    const patientProfile = await this.prisma.patientProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!patientProfile) return [];

    const bookings = await this.prisma.booking.findMany({
      where: { patientId: patientProfile.id },
      select: { provider: { select: { userId: true } } },
      distinct: ['providerId'],
    });

    const providerUserIds = bookings.map((b) => b.provider.userId);
    if (providerUserIds.length === 0) return [];

    return this.prisma.videoSession.findMany({
      where: {
        status: 'IN_PROGRESS',
        bookingId: null,
        creatorUserId: { in: providerUserIds },
      },
      orderBy: { startedAt: 'desc' },
      take: 5,
    });
  }

  async listMySessions(userId: string) {
    const provider = await this.prisma.providerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    const conditions: Prisma.VideoSessionWhereInput[] = [
      { creatorUserId: userId },
    ];
    if (provider) {
      conditions.push({ booking: { provider: { userId } } });
    }

    return this.prisma.videoSession.findMany({
      where: { OR: conditions },
      include: {
        booking: {
          include: {
            patient: { select: { name: true } },
            serviceCategory: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  private async upsertActiveSession(
    bookingId: string,
    userId: string,
    roomId: string,
  ) {
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

    const existing = await this.prisma.videoSession.findUnique({
      where: { bookingId },
      select: { startedAt: true },
    });

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
        // Preserve original startedAt so duration calculation stays accurate
        startedAt: existing?.startedAt ?? new Date(),
      },
    });
  }

  async endSession(bookingId: string, userId: string) {
    const session = await this.prisma.videoSession.findUnique({
      where: { bookingId },
    });
    if (!session) throw new NotFoundException('Video session not found');

    const booking = await this.prisma.booking.findUnique({
      where: { id: session.bookingId! },
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

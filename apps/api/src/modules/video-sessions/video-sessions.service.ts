import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SupabaseSyncService } from '../../common/supabase/supabase-sync.service';

@Injectable()
export class VideoSessionsService {
  constructor(
    private prisma: PrismaService,
    private readonly supabaseSync: SupabaseSyncService,
  ) {}

  async getSession(bookingId: string) {
    const session = await this.prisma.videoSession.findUnique({
      where: { bookingId },
    });
    if (!session) return null;
    return session;
  }

  /**
   * Mark the session as joined.
   * - Provider joining → IN_PROGRESS
   * - Patient joining → WAITING (if still CREATED), otherwise leave as-is.
   */
  async startSession(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        provider: { select: { userId: true } },
        patient: { select: { userId: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const isProvider = booking.provider.userId === userId;
    const isPatient = booking.patient.userId === userId;
    if (!isProvider && !isPatient) {
      throw new ForbiddenException(
        'Only the patient or provider of this booking can start the video session',
      );
    }

    const existing = await this.prisma.videoSession.findUnique({
      where: { bookingId },
      select: { startedAt: true, status: true, roomId: true },
    });

    const roomId = existing?.roomId ?? `curex24-${bookingId}`;
    const nextStatus = isProvider
      ? 'IN_PROGRESS'
      : existing?.status === 'IN_PROGRESS'
        ? 'IN_PROGRESS'
        : 'WAITING';

    const session = await this.prisma.videoSession.upsert({
      where: { bookingId },
      create: {
        bookingId,
        roomId,
        status: nextStatus,
        startedAt: nextStatus === 'IN_PROGRESS' ? new Date() : null,
        creatorUserId: userId,
      },
      update: {
        status: nextStatus,
        startedAt:
          nextStatus === 'IN_PROGRESS'
            ? (existing?.startedAt ?? new Date())
            : existing?.startedAt,
      },
    });


    if (nextStatus === 'IN_PROGRESS' && booking.status !== 'IN_PROGRESS') {
      const updatedBooking = await this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'IN_PROGRESS' },
      });
      await this.supabaseSync.syncBooking(updatedBooking);
    }
    await this.supabaseSync.syncVideoSession(session);
    return session;
  }

  async endSession(bookingId: string, userId: string) {
    const session = await this.prisma.videoSession.findUnique({
      where: { bookingId },
    });
    if (!session) throw new NotFoundException('Video session not found');

    const booking = await this.prisma.booking.findUnique({
      where: { id: session.bookingId! },
      include: {
        provider: { select: { userId: true } },
        patient: { select: { userId: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    if (
      booking.provider.userId !== userId &&
      booking.patient.userId !== userId
    ) {
      throw new ForbiddenException(
        'Only the patient or provider of this booking can end the video session',
      );
    }

    const endedAt = new Date();
    const duration = session.startedAt
      ? Math.round((endedAt.getTime() - session.startedAt.getTime()) / 1000)
      : 0;

    const updated = await this.prisma.videoSession.update({
      where: { bookingId },
      data: {
        status: 'COMPLETED',
        endedAt,
        duration,
      },
    });

    // Mark the booking itself as COMPLETED so both sides see the consultation end
    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'COMPLETED' },
    });

    await this.supabaseSync.syncBooking(updatedBooking);
    await this.supabaseSync.syncVideoSession(updated);
    return updated;
  }
}

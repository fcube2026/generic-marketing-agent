import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SupabaseSyncService } from '../../common/supabase/supabase-sync.service';
import { VideoSessionStatus } from '@prisma/client';

/** Default planned consultation duration in seconds (15 minutes). */
const DEFAULT_PLANNED_DURATION_SECONDS = 15 * 60;

/**
 * Generates a short, human-readable session token (e.g. "A3BF92CD").
 * Uses 4 random bytes → 8 uppercase hex chars.
 */
function generateSessionToken(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

@Injectable()
export class VideoConsultationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseSync: SupabaseSyncService,
  ) {}

  /**
   * Returns (creating if necessary) the Jitsi room details for a booking.
   * Both patient and provider call this to get the join URL.
   *
   * Returns { jitsiUrl, roomId, sessionToken, role }
   */
  async generateToken(
    userId: string,
    bookingId: string,
  ): Promise<{
    jitsiUrl: string;
    roomId: string;
    sessionToken: string;
    role: 'patient' | 'provider';
  }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        patient: { select: { userId: true } },
        provider: { select: { userId: true } },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.mode !== 'VIDEO_CONSULTATION') {
      throw new ForbiddenException('This booking is not a video consultation');
    }

    const isPatient = booking.patient.userId === userId;
    const isProvider = booking.provider.userId === userId;
    if (!isPatient && !isProvider) {
      throw new ForbiddenException('You are not a participant in this booking');
    }

    const role: 'patient' | 'provider' = isProvider ? 'provider' : 'patient';

    // Idempotently create or fetch the VideoSession
    let session = await this.prisma.videoSession.findUnique({
      where: { bookingId },
    });

    if (!session) {
      const roomId = `curex-${crypto.randomBytes(16).toString('hex')}`;
      const sessionToken = generateSessionToken();
      session = await this.prisma.videoSession.create({
        data: {
          bookingId,
          roomId,
          sessionToken,
          creatorUserId: userId,
          duration: DEFAULT_PLANNED_DURATION_SECONDS,
          status: 'CREATED',
        },
      });

      // Sync the new session to Supabase (best-effort)
      void this.supabaseSync
        .syncVideoSession({
          id: session.id,
          bookingId: session.bookingId,
          roomId: session.roomId,
          sessionToken: session.sessionToken ?? sessionToken,
          creatorUserId: userId,
          status: session.status,
          duration: session.duration ?? DEFAULT_PLANNED_DURATION_SECONDS,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
        })
        .catch(() => undefined);
    }

    const jitsiUrl = `https://meet.jit.si/${session.roomId}`;
    return {
      jitsiUrl,
      roomId: session.roomId,
      sessionToken: session.sessionToken ?? '',
      role,
    };
  }

  /**
   * Updates the VideoSession status. Allowed transitions:
   *   CREATED / WAITING → IN_PROGRESS (marks startedAt)
   *   IN_PROGRESS → COMPLETED (marks endedAt and computes actual duration)
   */
  async updateSessionStatus(
    userId: string,
    bookingId: string,
    status: VideoSessionStatus,
  ): Promise<{ status: VideoSessionStatus }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        patient: { select: { userId: true } },
        provider: { select: { userId: true } },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    const isPatient = booking.patient.userId === userId;
    const isProvider = booking.provider.userId === userId;
    if (!isPatient && !isProvider) {
      throw new ForbiddenException('You are not a participant in this booking');
    }

    const session = await this.prisma.videoSession.findUnique({
      where: { bookingId },
    });

    if (!session) throw new NotFoundException('Video session not found');

    const allowedStatuses: VideoSessionStatus[] = ['IN_PROGRESS', 'COMPLETED'];
    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException(`Status '${status}' is not allowed`);
    }

    const now = new Date();
    let actualDuration: number | undefined;
    if (status === 'COMPLETED' && session.startedAt) {
      actualDuration = Math.max(
        0,
        Math.round((now.getTime() - session.startedAt.getTime()) / 1000),
      );
    }

    const updated = await this.prisma.videoSession.update({
      where: { bookingId },
      data: {
        status,
        ...(status === 'IN_PROGRESS' && { startedAt: now }),
        ...(status === 'COMPLETED' && { endedAt: now }),
        ...(actualDuration !== undefined && { duration: actualDuration }),
      },
    });

    // Mirror status to booking
    if (status === 'IN_PROGRESS' && booking.status === 'ACCEPTED') {
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'IN_PROGRESS' },
      });
    } else if (
      status === 'COMPLETED' &&
      ['ACCEPTED', 'IN_PROGRESS'].includes(booking.status)
    ) {
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'COMPLETED' },
      });
    }

    // Sync updated session to Supabase (best-effort)
    void this.supabaseSync
      .syncVideoSession({
        id: updated.id,
        bookingId: updated.bookingId,
        roomId: updated.roomId,
        sessionToken: updated.sessionToken ?? undefined,
        creatorUserId: updated.creatorUserId ?? undefined,
        status: updated.status,
        duration: updated.duration ?? undefined,
        startedAt: updated.startedAt,
        endedAt: updated.endedAt,
      })
      .catch(() => undefined);

    return { status: updated.status };
  }
}

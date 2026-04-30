import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { VideoSessionStatus } from '@prisma/client';

@Injectable()
export class VideoConsultationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns (creating if necessary) the Jitsi room details for a booking.
   * Both patient and provider call this to get the join URL.
   *
   * Returns { jitsiUrl, roomId, role }
   */
  async generateToken(
    userId: string,
    bookingId: string,
  ): Promise<{
    jitsiUrl: string;
    roomId: string;
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
      session = await this.prisma.videoSession.create({
        data: {
          bookingId,
          roomId,
          status: 'CREATED',
        },
      });
    }

    const jitsiUrl = `https://meet.jit.si/${session.roomId}`;
    return { jitsiUrl, roomId: session.roomId, role };
  }

  /**
   * Updates the VideoSession status. Allowed transitions:
   *   CREATED / WAITING → IN_PROGRESS (marks startedAt)
   *   IN_PROGRESS → COMPLETED (marks endedAt and computes duration)
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
    let duration: number | undefined;
    if (status === 'COMPLETED' && session.startedAt) {
      duration = Math.round(
        (now.getTime() - session.startedAt.getTime()) / 1000,
      );
    }

    const updated = await this.prisma.videoSession.update({
      where: { bookingId },
      data: {
        status,
        startedAt: status === 'IN_PROGRESS' ? now : undefined,
        endedAt: status === 'COMPLETED' ? now : undefined,
        duration: duration ?? undefined,
      },
    });

    // Mirror status to booking when session starts
    if (status === 'IN_PROGRESS' && booking.status === 'ACCEPTED') {
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    return { status: updated.status };
  }
}

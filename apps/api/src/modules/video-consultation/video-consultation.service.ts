import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';

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
}

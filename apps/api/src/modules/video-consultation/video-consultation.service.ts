import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SupabaseSyncService } from '../../common/supabase/supabase-sync.service';

/**
 * Mock-only video consultation service.
 *
 * The real 100ms/LiveKit integrations have been removed to maintain
 * a stable JS-only environment. All rooms and tokens returned
 * by this service are deterministic mock values.
 */
@Injectable()
export class VideoConsultationService {
  private readonly logger = new Logger(VideoConsultationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseSync: SupabaseSyncService,
  ) {
    this.logger.warn(
      'VideoConsultationService is running in MOCK mode — all video sessions are mock values.',
    );
  }

  private async getBookingWithParticipants(bookingId: string) {
    return this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        patient: { select: { userId: true } },
        provider: { select: { userId: true } },
      },
    });
  }

  private assertParticipant(
    booking: { patient: { userId: string }; provider: { userId: string } },
    userId: string,
  ): 'host' | 'guest' {
    if (booking.provider.userId === userId) return 'host';
    if (booking.patient.userId === userId) return 'guest';
    throw new ForbiddenException(
      'Only the patient or provider of this booking can access the video session',
    );
  }

  async createRoom(bookingId: string, userId: string) {
    const booking = await this.getBookingWithParticipants(bookingId);
    if (!booking) throw new NotFoundException('Booking not found');

    this.assertParticipant(booking, userId);

    if (booking.status !== 'ACCEPTED') {
      throw new BadRequestException(
        'A video room can only be created for an accepted booking',
      );
    }

    const existing = await this.prisma.videoSession.findUnique({
      where: { bookingId },
    });
    if (existing) return existing;

    const roomId = `mock-room-${bookingId}`;

    const session = await this.prisma.videoSession.create({
      data: {
        bookingId,
        roomId,
        status: 'CREATED',
        creatorUserId: userId,
      },
    });
    await this.supabaseSync.syncVideoSession(session);
    return session;
  }

  async generateToken(bookingId: string, userId: string, role?: string) {
    const booking = await this.getBookingWithParticipants(bookingId);
    if (!booking) throw new NotFoundException('Booking not found');

    const participantRole = this.assertParticipant(booking, userId);
    const tokenRole = role ?? participantRole;

    const session = await this.prisma.videoSession.findUnique({
      where: { bookingId },
    });
    if (!session) {
      throw new NotFoundException(
        'Video session not found. Create a room first.',
      );
    }

    const token = `mock-token-${session.roomId}-${userId}-${tokenRole}`;

    const updated = await this.prisma.videoSession.update({
      where: { bookingId },
      data: { sessionToken: token },
    });
    await this.supabaseSync.syncVideoSession(updated);

    return { token, roomId: session.roomId, role: tokenRole };
  }
}

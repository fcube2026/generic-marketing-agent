import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SDK as HMSSDK } from '@100mslive/server-sdk';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class VideoConsultationService {
  private readonly logger = new Logger(VideoConsultationService.name);
  private hms: HMSSDK;
  private readonly mockMode: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.mockMode =
      this.config.get<string>('VIDEO_MOCK_MODE', 'false') === 'true';

    if (this.mockMode) {
      this.logger.warn(
        'VideoConsultationService is running in MOCK mode — no real 100ms API calls will be made.',
      );
    }

    const accessKey = this.config.get<string>('HMS_APP_ACCESS_KEY', '');
    const secret = this.config.get<string>('HMS_APP_SECRET', '');
    this.hms = new HMSSDK(accessKey, secret);
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

    let roomId: string;

    if (this.mockMode) {
      roomId = `mock-room-${bookingId}`;
      this.logger.debug(`[MOCK] createRoom — using mock roomId: ${roomId}`);
    } else {
      const templateId = this.config.get<string>('HMS_TEMPLATE_ID');
      try {
        const room = await this.hms.rooms.create({
          name: `curex24-${bookingId}`,
          description: `Video consultation for booking ${bookingId}`,
          ...(templateId ? { template_id: templateId } : {}),
        });
        roomId = room.id;
      } catch (err) {
        this.logger.error(
          `Failed to create 100ms room for booking ${bookingId}: ${(err as Error).message}`,
        );
        throw new InternalServerErrorException(
          'Failed to create video room. Please try again.',
        );
      }
    }

    return this.prisma.videoSession.create({
      data: {
        bookingId,
        roomId,
        status: 'CREATED',
      },
    });
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

    let token: string;

    if (this.mockMode) {
      token = `mock-token-${session.roomId}-${userId}-${tokenRole}`;
      this.logger.debug(
        `[MOCK] generateToken — using mock token for userId: ${userId}`,
      );
    } else {
      try {
        const authToken = await this.hms.auth.getAuthToken({
          roomId: session.roomId,
          userId,
          role: tokenRole,
        });
        token = authToken.token;
      } catch (err) {
        this.logger.error(
          `Failed to generate 100ms token for booking ${bookingId}: ${(err as Error).message}`,
        );
        throw new InternalServerErrorException(
          'Failed to generate join token. Please try again.',
        );
      }
    }

    return { token, roomId: session.roomId, role: tokenRole };
  }
}

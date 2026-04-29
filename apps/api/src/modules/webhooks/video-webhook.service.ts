import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  VideoWebhookEventDto,
  VideoWebhookEventType,
} from './dto/video-webhook-event.dto';

/** Terminal states — once a session reaches one of these it should not be updated again. */
const TERMINAL_STATUSES = ['COMPLETED', 'FAILED', 'EXPIRED'] as const;

@Injectable()
export class VideoWebhookService {
  private readonly logger = new Logger(VideoWebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Entry point for processing an incoming video lifecycle webhook event.
   */
  async handleEvent(
    event: VideoWebhookEventDto,
  ): Promise<{ processed: boolean; message: string }> {
    this.logger.log(
      `Received video webhook event: ${event.type} — data: ${JSON.stringify(event.data)}`,
    );

    switch (event.type as VideoWebhookEventType) {
      case 'session.started':
        return this.handleSessionStarted(event);
      case 'session.ended':
        return this.handleSessionEnded(event);
      case 'participant.joined':
        return this.handleParticipantJoined(event);
      case 'participant.left':
        return this.handleParticipantLeft(event);
      default: {
        const exhaustiveCheck: never = event.type as never;
        throw new BadRequestException(`Unknown event type: ${exhaustiveCheck}`);
      }
    }
  }

  // ─── Private event handlers ──────────────────────────────────────────────

  private async handleSessionStarted(event: VideoWebhookEventDto) {
    const session = await this.resolveSession(event);

    if (TERMINAL_STATUSES.includes(session.status as any)) {
      this.logger.warn(
        `session.started ignored — session ${session.id} is already in terminal state ${session.status}`,
      );
      return {
        processed: false,
        message: `Session already in ${session.status} state`,
      };
    }

    await this.prisma.videoSession.update({
      where: { id: session.id },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
    });

    if (session.bookingId) {
      await this.prisma.booking.update({
        where: { id: session.bookingId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    this.logger.log(
      `session.started — VideoSession ${session.id} → IN_PROGRESS`,
    );
    return { processed: true, message: 'Session marked as IN_PROGRESS' };
  }

  private async handleSessionEnded(event: VideoWebhookEventDto) {
    const session = await this.resolveSession(event);

    if (TERMINAL_STATUSES.includes(session.status as any)) {
      this.logger.warn(
        `session.ended ignored — session ${session.id} is already in terminal state ${session.status}`,
      );
      return {
        processed: false,
        message: `Session already in ${session.status} state`,
      };
    }

    const endedAt = new Date();
    const duration = session.startedAt
      ? Math.round((endedAt.getTime() - session.startedAt.getTime()) / 1000)
      : null;

    await this.prisma.videoSession.update({
      where: { id: session.id },
      data: {
        status: 'COMPLETED',
        endedAt,
        ...(duration !== null ? { duration } : {}),
      },
    });

    if (session.bookingId) {
      await this.prisma.booking.update({
        where: { id: session.bookingId },
        data: { status: 'COMPLETED' },
      });
    }

    this.logger.log(
      `session.ended — VideoSession ${session.id} → COMPLETED (duration: ${duration ?? 'unknown'}s)`,
    );
    return { processed: true, message: 'Session marked as COMPLETED' };
  }

  private async handleParticipantJoined(event: VideoWebhookEventDto) {
    const session = await this.resolveSession(event);

    if (TERMINAL_STATUSES.includes(session.status as any)) {
      this.logger.warn(
        `participant.joined ignored — session ${session.id} is in terminal state ${session.status}`,
      );
      return {
        processed: false,
        message: `Session already in ${session.status} state`,
      };
    }

    // Only transition CREATED → WAITING on first join.
    if (session.status === 'CREATED') {
      await this.prisma.videoSession.update({
        where: { id: session.id },
        data: { status: 'WAITING' },
      });
      this.logger.log(
        `participant.joined — VideoSession ${session.id} → WAITING`,
      );
      return { processed: true, message: 'Session marked as WAITING' };
    }

    this.logger.debug(
      `participant.joined — VideoSession ${session.id} already in ${session.status}, no change`,
    );
    return { processed: true, message: 'Participant join recorded' };
  }

  private async handleParticipantLeft(event: VideoWebhookEventDto) {
    const session = await this.resolveSession(event);

    this.logger.log(
      `participant.left — VideoSession ${session.id} (status: ${session.status})`,
    );
    return { processed: true, message: 'Participant leave recorded' };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Resolve a VideoSession from the event data.
   * Tries room_id first, then booking_id as a fallback.
   */
  private async resolveSession(event: VideoWebhookEventDto) {
    const { room_id, booking_id } = event.data;

    if (!room_id && !booking_id) {
      throw new BadRequestException(
        'Event data must include room_id or booking_id',
      );
    }

    let session: Awaited<
      ReturnType<typeof this.prisma.videoSession.findUnique>
    > | null = null;

    if (room_id) {
      session = await this.prisma.videoSession.findUnique({
        where: { roomId: room_id },
      });
    }

    if (!session && booking_id) {
      session = await this.prisma.videoSession.findUnique({
        where: { bookingId: booking_id },
      });
    }

    if (!session) {
      throw new NotFoundException(
        `VideoSession not found for room_id=${room_id} booking_id=${booking_id}`,
      );
    }

    return session;
  }
}

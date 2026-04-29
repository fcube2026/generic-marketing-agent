import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/roles.decorator';
import { VideoWebhookService } from './video-webhook.service';
import { VideoWebhookEventDto } from './dto/video-webhook-event.dto';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly videoWebhookService: VideoWebhookService) {}

  /**
   * Receives video session lifecycle events and updates
   * VideoSession / Booking statuses accordingly.
   *
   * This endpoint processes events emitted by external video infrastructure
   * (e.g. a Jitsi Jicofo webhook or an internal session management service).
   * Signature verification can be added inside VideoWebhookService.handleEvent
   * without changing this controller.
   */
  @Public()
  @Post('video-events')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Handle video session lifecycle event',
    description:
      'Endpoint for video session lifecycle events. ' +
      'Processes events such as session.started, session.ended, participant.joined, ' +
      'and participant.left, updating VideoSession and Booking statuses accordingly.',
  })
  @ApiOkResponse({
    description: 'Event processed',
    schema: {
      example: { processed: true, message: 'Session marked as IN_PROGRESS' },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid event type or missing required fields',
  })
  @ApiNotFoundResponse({
    description: 'VideoSession not found for the given room_id or booking_id',
  })
  handleVideoEvent(@Body() event: VideoWebhookEventDto) {
    return this.videoWebhookService.handleEvent(event);
  }
}

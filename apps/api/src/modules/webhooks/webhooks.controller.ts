import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
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
   * Receives mock (or real) video session lifecycle events and updates
   * VideoSession / Booking statuses accordingly.
   *
   * In VIDEO_MOCK_MODE=true the endpoint accepts any well-formed payload
   * without signature verification, allowing easy local testing.
   *
   * When VIDEO_MOCK_MODE is disabled (production), a real 100ms signature
   * header can be verified inside VideoWebhookService.handleEvent without
   * any change to this controller.
   */
  @Public()
  @Post('video-mock')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Handle video session lifecycle event (mock mode)',
    description:
      'Internal endpoint for simulating 100ms video session lifecycle events. ' +
      'Processes events such as session.started, session.ended, participant.joined, ' +
      'and participant.left, updating VideoSession and Booking statuses accordingly. ' +
      'In VIDEO_MOCK_MODE=true, signature verification is skipped.',
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
  handleVideoEvent(
    @Body() event: VideoWebhookEventDto,
    @Headers('x-100ms-signature') signature?: string,
  ) {
    return this.videoWebhookService.handleEvent(event, signature);
  }
}

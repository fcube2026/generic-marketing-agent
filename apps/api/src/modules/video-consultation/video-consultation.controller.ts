import { Controller, Get, Param } from '@nestjs/common';
import { VideoConsultationService } from './video-consultation.service';
import { CurrentUser } from '../auth/decorators/roles.decorator';

@Controller('video-sessions')
export class VideoConsultationController {
  constructor(
    private readonly videoConsultationService: VideoConsultationService,
  ) {}

  /**
   * GET /video-sessions/:bookingId/token
   * Returns the Jitsi room URL and role for the authenticated user.
   * Idempotently creates the VideoSession on first call.
   */
  @Get(':bookingId/token')
  getToken(@CurrentUser() user: any, @Param('bookingId') bookingId: string) {
    return this.videoConsultationService.generateToken(user.id, bookingId);
  }
}

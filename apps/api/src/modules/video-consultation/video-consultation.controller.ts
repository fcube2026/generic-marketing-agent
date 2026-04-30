import { Body, Controller, Get, HttpCode, Param, Patch } from '@nestjs/common';
import { VideoConsultationService } from './video-consultation.service';
import { CurrentUser } from '../auth/decorators/roles.decorator';
import { VideoSessionStatus } from '@prisma/client';

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

  /**
   * PATCH /video-sessions/:bookingId/status
   * Updates the VideoSession status (IN_PROGRESS or COMPLETED).
   * Also mirrors IN_PROGRESS to the booking when the call starts.
   */
  @Patch(':bookingId/status')
  @HttpCode(200)
  updateStatus(
    @CurrentUser() user: any,
    @Param('bookingId') bookingId: string,
    @Body('status') status: VideoSessionStatus,
  ) {
    return this.videoConsultationService.updateSessionStatus(
      user.id,
      bookingId,
      status,
    );
  }
}

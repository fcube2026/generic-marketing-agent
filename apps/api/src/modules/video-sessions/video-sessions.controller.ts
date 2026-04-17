import { Controller, Get, Post, Param } from '@nestjs/common';
import { VideoSessionsService } from './video-sessions.service';
import { CurrentUser } from '../auth/decorators/roles.decorator';

@Controller('video-sessions')
export class VideoSessionsController {
  constructor(private videoSessionsService: VideoSessionsService) {}

  @Get(':bookingId')
  getSession(@CurrentUser() user: any, @Param('bookingId') bookingId: string) {
    return this.videoSessionsService.getSession(bookingId);
  }

  @Post(':bookingId/start')
  startSession(
    @CurrentUser() user: any,
    @Param('bookingId') bookingId: string,
  ) {
    return this.videoSessionsService.startSession(bookingId, user.id);
  }

  @Post(':bookingId/instant')
  startInstantSession(
    @CurrentUser() user: any,
    @Param('bookingId') bookingId: string,
  ) {
    return this.videoSessionsService.startInstantSession(bookingId, user.id);
  }

  @Post(':bookingId/end')
  endSession(@CurrentUser() user: any, @Param('bookingId') bookingId: string) {
    return this.videoSessionsService.endSession(bookingId, user.id);
  }
}

import { Controller, Get, Post, Param } from '@nestjs/common';
import { VideoSessionsService } from './video-sessions.service';
import { CurrentUser } from '../auth/decorators/roles.decorator';

@Controller('video-sessions')
export class VideoSessionsController {
  constructor(private videoSessionsService: VideoSessionsService) {}

  @Get('for-patient')
  getSessionsForPatient(@CurrentUser() user: any) {
    return this.videoSessionsService.getSessionsForPatient(user.id);
  }

  @Get('my')
  listMySessions(@CurrentUser() user: any) {
    return this.videoSessionsService.listMySessions(user.id);
  }

  @Post('instant')
  createInstantSession(@CurrentUser() user: any) {
    return this.videoSessionsService.createInstantSession(user.id);
  }

  @Get(':bookingId')
  getSession(@Param('bookingId') bookingId: string) {
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

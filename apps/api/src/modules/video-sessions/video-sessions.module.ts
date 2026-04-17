import { Module } from '@nestjs/common';
import { VideoSessionsService } from './video-sessions.service';
import { VideoSessionsController } from './video-sessions.controller';

@Module({
  providers: [VideoSessionsService],
  controllers: [VideoSessionsController],
})
export class VideoSessionsModule {}

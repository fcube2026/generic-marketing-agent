import { Module } from '@nestjs/common';
import { VideoSessionsService } from './video-sessions.service';
import { VideoSessionsController } from './video-sessions.controller';
import { SupabaseSyncModule } from '../../common/supabase/supabase-sync.module';

@Module({
  imports: [SupabaseSyncModule],
  providers: [VideoSessionsService],
  controllers: [VideoSessionsController],
})
export class VideoSessionsModule {}

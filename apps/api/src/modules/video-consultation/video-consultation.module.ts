import { Module } from '@nestjs/common';
import { VideoConsultationService } from './video-consultation.service';
import { VideoConsultationController } from './video-consultation.controller';
import { SupabaseSyncModule } from '../../common/supabase/supabase-sync.module';

@Module({
  imports: [SupabaseSyncModule],
  providers: [VideoConsultationService],
  controllers: [VideoConsultationController],
  exports: [VideoConsultationService],
})
export class VideoConsultationModule {}

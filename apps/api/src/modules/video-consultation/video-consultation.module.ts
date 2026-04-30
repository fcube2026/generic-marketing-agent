import { Module } from '@nestjs/common';
import { VideoConsultationService } from './video-consultation.service';
import { VideoConsultationController } from './video-consultation.controller';

@Module({
  providers: [VideoConsultationService],
  controllers: [VideoConsultationController],
  exports: [VideoConsultationService],
})
export class VideoConsultationModule {}

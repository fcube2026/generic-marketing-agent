import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VideoConsultationService } from './video-consultation.service';
import { VideoConsultationController } from './video-consultation.controller';

@Module({
  imports: [ConfigModule],
  providers: [VideoConsultationService],
  controllers: [VideoConsultationController],
  exports: [VideoConsultationService],
})
export class VideoConsultationModule {}

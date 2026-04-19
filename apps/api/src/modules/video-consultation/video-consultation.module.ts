import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VideoConsultationService } from './video-consultation.service';
import { VideoConsultationController } from './video-consultation.controller';
import { VideoConsultationReminderService } from './video-consultation-reminder.service';
import { VideoConsultationReminderProcessor } from './video-consultation-reminder.processor';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ConfigModule, NotificationsModule],
  providers: [
    VideoConsultationService,
    VideoConsultationReminderService,
    VideoConsultationReminderProcessor,
  ],
  controllers: [VideoConsultationController],
  exports: [VideoConsultationService, VideoConsultationReminderService],
})
export class VideoConsultationModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VideoConsultationService } from './video-consultation.service';
import { VideoConsultationController } from './video-consultation.controller';
import { VideoConsultationReminderService } from './video-consultation-reminder.service';
import { VideoConsultationReminderProcessor } from './video-consultation-reminder.processor';
import { NotificationsModule } from '../notifications/notifications.module';
import { QUEUES_ENABLED } from '../../common/queue/queue.module';

const queueProviders = QUEUES_ENABLED
  ? [VideoConsultationReminderProcessor]
  : [];

@Module({
  imports: [ConfigModule, NotificationsModule],
  providers: [
    VideoConsultationService,
    VideoConsultationReminderService,
    ...queueProviders,
  ],
  controllers: [VideoConsultationController],
  exports: [VideoConsultationService, VideoConsultationReminderService],
})
export class VideoConsultationModule {}

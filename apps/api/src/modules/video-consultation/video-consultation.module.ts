import { Module } from '@nestjs/common';
import { VideoConsultationController } from './video-consultation.controller';
import { VideoConsultationService } from './video-consultation.service';
import { VideoConsultationReminderService } from './video-consultation-reminder.service';
import { VideoConsultationReminderProcessor } from './video-consultation-reminder.processor';
import { NotificationsModule } from '../notifications/notifications.module';
import { QUEUES_ENABLED } from '../../common/queue/queue.module';

const queueProviders = QUEUES_ENABLED
  ? [VideoConsultationReminderProcessor]
  : [];

@Module({
  imports: [NotificationsModule],
  controllers: [VideoConsultationController],
  providers: [
    VideoConsultationService,
    VideoConsultationReminderService,
    ...queueProviders,
  ],
  exports: [VideoConsultationService, VideoConsultationReminderService],
})
export class VideoConsultationModule {}

import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PushNotificationModule } from '../push-notifications/push-notification.module';
import { SmsModule } from '../sms/sms.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { NotificationQueueProcessor } from './notification-queue.processor';
import { FallbackQueueProcessor } from './fallback-queue.processor';
import { AppointmentReminderScheduler } from './appointment-reminder.scheduler';
import { QUEUES_ENABLED } from '../../common/queue/queue.module';

const queueProviders = QUEUES_ENABLED
  ? [NotificationQueueProcessor, FallbackQueueProcessor]
  : [];

@Module({
  imports: [PushNotificationModule, SmsModule, WhatsAppModule],
  providers: [
    NotificationsService,
    ...queueProviders,
    AppointmentReminderScheduler,
  ],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}

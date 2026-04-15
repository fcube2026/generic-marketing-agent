import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PushNotificationModule } from '../push-notifications/push-notification.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [PushNotificationModule, SmsModule],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}

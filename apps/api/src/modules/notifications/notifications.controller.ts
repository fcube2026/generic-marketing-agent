import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Logger,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from '../push-notifications/push-notification.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { CurrentUser, Public } from '../auth/decorators/roles.decorator';
import { NotificationChannel } from '@prisma/client';

class RegisterDeviceTokenDto {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

class UpdatePreferencesDto {
  pushEnabled?: boolean;
  smsEnabled?: boolean;
  whatsappEnabled?: boolean;
  emailEnabled?: boolean;
  bookingUpdates?: boolean;
  paymentUpdates?: boolean;
  reminderEnabled?: boolean;
  marketingEnabled?: boolean;
}

@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(
    private notificationsService: NotificationsService,
    private pushService: PushNotificationService,
    private whatsappService: WhatsAppService,
  ) {}

  @Get('me')
  getMyNotifications(@CurrentUser() user: any) {
    return this.notificationsService.getUserNotifications(user.id);
  }

  @Get('me/unread-count')
  getUnreadCount(@CurrentUser() user: any) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Put(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Put('me/read-all')
  markAllAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  // Device token management
  @Post('device-token')
  async registerDeviceToken(
    @CurrentUser() user: any,
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    await this.pushService.registerDeviceToken(
      user.id,
      dto.token,
      dto.platform,
    );
    return { success: true, message: 'Device token registered' };
  }

  @Put('device-token/unregister')
  async unregisterDeviceToken(
    @CurrentUser() user: any,
    @Body() dto: { token: string },
  ) {
    await this.pushService.unregisterDeviceToken(dto.token);
    return { success: true, message: 'Device token unregistered' };
  }

  // Notification preferences
  @Get('me/preferences')
  getPreferences(@CurrentUser() user: any) {
    return this.notificationsService.getUserPreferences(user.id);
  }

  @Put('me/preferences')
  updatePreferences(
    @CurrentUser() user: any,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.notificationsService.updateUserPreferences(user.id, dto);
  }

  // Notification logs
  @Get('me/logs')
  getNotificationLogs(
    @CurrentUser() user: any,
    @Body() dto?: { channel?: NotificationChannel; limit?: number },
  ) {
    return this.notificationsService.getNotificationLogs(user.id, dto);
  }

  /**
   * Webhook endpoint for Twilio WhatsApp/SMS status callbacks
   * This should be configured as the StatusCallback URL in Twilio
   * Route: POST /notifications/webhook/twilio
   */
  @Public()
  @Post('webhook/twilio')
  async twilioWebhook(@Body() body: Record<string, string>) {
    this.logger.log(`Twilio webhook received: ${JSON.stringify(body)}`);

    // Parse the callback
    const statusInfo = this.whatsappService.parseStatusCallback(body);
    if (!statusInfo) {
      this.logger.warn('Invalid Twilio webhook payload');
      return { success: false, message: 'Invalid payload' };
    }

    // Map Twilio status to our status
    // Twilio statuses: queued, failed, sent, delivered, undelivered, read
    let status: 'delivered' | 'failed' | 'read';
    switch (statusInfo.status) {
      case 'delivered':
        status = 'delivered';
        break;
      case 'read':
        status = 'read';
        break;
      case 'failed':
      case 'undelivered':
        status = 'failed';
        break;
      default:
        // For other statuses (queued, sent), we don't need to update
        return { success: true, message: 'Status noted' };
    }

    // Update delivery status
    await this.notificationsService.updateDeliveryStatus(
      statusInfo.messageId,
      status,
      statusInfo.errorMessage,
    );

    return { success: true };
  }
}

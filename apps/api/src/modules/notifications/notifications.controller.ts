import { Controller, Get, Put, Post, Param, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from '../push-notifications/push-notification.service';
import { CurrentUser } from '../auth/decorators/roles.decorator';

class RegisterDeviceTokenDto {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

class UpdatePreferencesDto {
  pushEnabled?: boolean;
  smsEnabled?: boolean;
  emailEnabled?: boolean;
  bookingUpdates?: boolean;
  paymentUpdates?: boolean;
  reminderEnabled?: boolean;
  marketingEnabled?: boolean;
}

@Controller('notifications')
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private pushService: PushNotificationService,
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
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Global feature flags for notification channels and other features.
 * Configured via environment variables with sensible defaults.
 */
export interface FeatureFlags {
  pushNotifications: boolean;
  whatsappNotifications: boolean;
  smsNotifications: boolean;
  notificationQueue: boolean;
  appointmentReminders: boolean;
}

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);
  private readonly flags: FeatureFlags;

  constructor(private configService: ConfigService) {
    this.flags = {
      pushNotifications: this.parseBoolean('FEATURE_PUSH_NOTIFICATIONS', true),
      whatsappNotifications: this.parseBoolean(
        'FEATURE_WHATSAPP_NOTIFICATIONS',
        true,
      ),
      smsNotifications: this.parseBoolean('FEATURE_SMS_NOTIFICATIONS', true),
      notificationQueue: this.parseBoolean('FEATURE_NOTIFICATION_QUEUE', true),
      appointmentReminders: this.parseBoolean(
        'FEATURE_APPOINTMENT_REMINDERS',
        true,
      ),
    };

    this.logger.log(`Feature flags initialized: ${JSON.stringify(this.flags)}`);
  }

  private parseBoolean(key: string, defaultValue: boolean): boolean {
    const value = this.configService.get<string>(key);
    if (value === undefined || value === null) {
      return defaultValue;
    }
    return value.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Check if push notifications are enabled globally
   */
  isPushNotificationsEnabled(): boolean {
    return this.flags.pushNotifications;
  }

  /**
   * Check if WhatsApp notifications are enabled globally
   */
  isWhatsappNotificationsEnabled(): boolean {
    return this.flags.whatsappNotifications;
  }

  /**
   * Check if SMS notifications are enabled globally
   */
  isSmsNotificationsEnabled(): boolean {
    return this.flags.smsNotifications;
  }

  /**
   * Check if notification queue processing is enabled
   */
  isNotificationQueueEnabled(): boolean {
    return this.flags.notificationQueue;
  }

  /**
   * Check if appointment reminders are enabled
   */
  isAppointmentRemindersEnabled(): boolean {
    return this.flags.appointmentReminders;
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): FeatureFlags {
    return { ...this.flags };
  }

  /**
   * Check if a specific channel is enabled
   */
  isChannelEnabled(channel: 'push' | 'whatsapp' | 'sms' | 'email'): boolean {
    switch (channel) {
      case 'push':
        return this.flags.pushNotifications;
      case 'whatsapp':
        return this.flags.whatsappNotifications;
      case 'sms':
        return this.flags.smsNotifications;
      case 'email':
        return false; // Email not implemented yet
      default:
        return false;
    }
  }
}

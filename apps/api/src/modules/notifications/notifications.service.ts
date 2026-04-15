import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PushNotificationService } from '../push-notifications/push-notification.service';
import { SmsService, SMS_TEMPLATES } from '../sms/sms.service';

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: string;
  metadata?: Record<string, unknown>;
}

export interface SendNotificationOptions {
  /** Send in-app notification (stored in database) */
  inApp?: boolean;
  /** Send push notification to mobile devices */
  push?: boolean;
  /** Send SMS notification */
  sms?: boolean;
  /** SMS template key (from SMS_TEMPLATES) */
  smsTemplate?: string;
  /** Parameters for SMS template */
  smsParams?: Record<string, string>;
  /** Override phone number (otherwise fetched from user) */
  phone?: string;
}

// Notification types that should trigger SMS by default
const SMS_ENABLED_TYPES = [
  'BOOKING_ACCEPTED',
  'BOOKING_DECLINED',
  'BOOKING_CANCELLED',
  'PROVIDER_ON_THE_WAY',
  'PROVIDER_ARRIVED',
  'CONSULTATION_COMPLETED',
  'LAB_RESULT_READY',
  'PAYMENT_SUCCESS',
  'PAYMENT_REFUNDED',
  'BOOKING_REQUEST',
  'PROVIDER_APPROVED',
  'PROVIDER_REJECTED',
  'PAYOUT_PROCESSED',
  'APPOINTMENT_REMINDER',
];

// Notification types that should trigger push by default
const PUSH_ENABLED_TYPES = [
  'BOOKING_REQUEST',
  'BOOKING_ACCEPTED',
  'BOOKING_DECLINED',
  'BOOKING_CANCELLED',
  'BOOKING_STATUS_UPDATE',
  'PROVIDER_ON_THE_WAY',
  'PROVIDER_ARRIVED',
  'CONSULTATION_STARTED',
  'CONSULTATION_COMPLETED',
  'LAB_RESULT_READY',
  'PAYMENT_SUCCESS',
  'PAYMENT_REFUNDED',
  'PROVIDER_APPROVED',
  'PROVIDER_REJECTED',
  'PROVIDER_DEACTIVATED',
  'PAYOUT_PROCESSED',
  'APPOINTMENT_REMINDER',
  'NMC_VERIFICATION_SUCCESS',
];

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private pushService: PushNotificationService,
    private smsService: SmsService,
  ) {}

  async getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Get user's notification preferences (creates default if not exists)
   */
  async getUserPreferences(userId: string) {
    let prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      prefs = await this.prisma.notificationPreference.create({
        data: { userId },
      });
    }

    return prefs;
  }

  /**
   * Update user's notification preferences
   */
  async updateUserPreferences(
    userId: string,
    data: {
      pushEnabled?: boolean;
      smsEnabled?: boolean;
      emailEnabled?: boolean;
      bookingUpdates?: boolean;
      paymentUpdates?: boolean;
      reminderEnabled?: boolean;
      marketingEnabled?: boolean;
    },
  ) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  /**
   * Legacy method - creates in-app notification only (backwards compatible)
   */
  async createNotification(data: NotificationPayload) {
    // For backward compatibility, this method creates in-app notification
    // and attempts push/SMS based on notification type
    return this.sendNotification(data, {
      inApp: true,
      push: PUSH_ENABLED_TYPES.includes(data.type),
      sms: false, // Don't auto-send SMS from legacy calls to avoid breaking changes
    });
  }

  /**
   * Send notification via multiple channels
   */
  async sendNotification(
    payload: NotificationPayload,
    options: SendNotificationOptions = { inApp: true, push: true },
  ): Promise<{
    inAppId?: string;
    pushSent: boolean;
    smsSent: boolean;
  }> {
    const result = {
      inAppId: undefined as string | undefined,
      pushSent: false,
      smsSent: false,
    };

    // Get user preferences
    const prefs = await this.getUserPreferences(payload.userId);

    // Check category-specific preferences
    const isBookingType =
      payload.type.includes('BOOKING') ||
      payload.type.includes('PROVIDER_ON') ||
      payload.type.includes('PROVIDER_ARRIVED') ||
      payload.type.includes('CONSULTATION');
    const isPaymentType =
      payload.type.includes('PAYMENT') ||
      payload.type.includes('PAYOUT') ||
      payload.type.includes('REFUND');
    const isReminderType = payload.type.includes('REMINDER');

    const categoryEnabled =
      (isBookingType && prefs.bookingUpdates) ||
      (isPaymentType && prefs.paymentUpdates) ||
      (isReminderType && prefs.reminderEnabled) ||
      (!isBookingType && !isPaymentType && !isReminderType); // Other types always enabled

    // 1. Create in-app notification (always, if requested)
    if (options.inApp !== false) {
      const notification = await this.prisma.notification.create({
        data: {
          userId: payload.userId,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          metadata: payload.metadata ? (payload.metadata as any) : undefined,
        },
      });
      result.inAppId = notification.id;
    }

    // 2. Send push notification (if enabled and preferences allow)
    if (options.push !== false && prefs.pushEnabled && categoryEnabled) {
      try {
        const unreadCount = await this.pushService.getUnreadBadgeCount(
          payload.userId,
        );
        const pushResult = await this.pushService.sendToUser({
          userId: payload.userId,
          title: payload.title,
          body: payload.message,
          data: {
            type: payload.type,
            ...payload.metadata,
          },
          badge: unreadCount + 1,
        });
        result.pushSent = pushResult.success;
      } catch (error) {
        this.logger.error(`Failed to send push notification: ${error}`);
      }
    }

    // 3. Send SMS (if enabled and preferences allow)
    if (options.sms && prefs.smsEnabled && categoryEnabled) {
      try {
        // Get user's phone number
        let phone = options.phone;
        if (!phone) {
          const user = await this.prisma.user.findUnique({
            where: { id: payload.userId },
            select: { phone: true },
          });
          phone = user?.phone;
        }

        if (
          phone &&
          options.smsTemplate &&
          SMS_TEMPLATES[options.smsTemplate]
        ) {
          const smsResult = await this.smsService.sendTemplatedSms(
            phone,
            options.smsTemplate,
            options.smsParams || {},
          );
          result.smsSent = smsResult.success;
        } else if (phone) {
          // Fallback to using the notification message directly
          const smsResult = await this.smsService.sendSms({
            to: phone,
            body: `${payload.title}: ${payload.message}`.substring(0, 160),
          });
          result.smsSent = smsResult.success;
        }
      } catch (error) {
        this.logger.error(`Failed to send SMS notification: ${error}`);
      }
    }

    return result;
  }

  /**
   * Send notification to multiple users
   */
  async sendBulkNotification(
    userIds: string[],
    payload: Omit<NotificationPayload, 'userId'>,
    options: SendNotificationOptions = { inApp: true, push: true },
  ): Promise<{ sentCount: number; failedCount: number }> {
    let sentCount = 0;
    let failedCount = 0;

    for (const userId of userIds) {
      try {
        await this.sendNotification({ ...payload, userId }, options);
        sentCount++;
      } catch (error) {
        this.logger.error(
          `Failed to send notification to user ${userId}: ${error}`,
        );
        failedCount++;
      }
    }

    return { sentCount, failedCount };
  }
}

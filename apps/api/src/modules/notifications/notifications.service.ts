import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PushNotificationService } from '../push-notifications/push-notification.service';
import { SmsService, SMS_TEMPLATES } from '../sms/sms.service';
import {
  WhatsAppService,
  WHATSAPP_TEMPLATES,
} from '../whatsapp/whatsapp.service';
import { FeatureFlagService } from '../../common/feature-flags/feature-flags.service';
import {
  NOTIFICATION_QUEUE,
  FALLBACK_QUEUE,
} from '../../common/queue/queue.module';
import { NotificationJobData } from './notification-queue.processor';
import {
  FallbackJobData,
  WHATSAPP_FALLBACK_DELAY_MS,
} from './fallback-queue.processor';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
} from '@prisma/client';

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
  /** Send WhatsApp notification (primary messaging channel) */
  whatsapp?: boolean;
  /** Send SMS notification (fallback channel) */
  sms?: boolean;
  /** SMS template key (from SMS_TEMPLATES) */
  smsTemplate?: string;
  /** WhatsApp template key (from WHATSAPP_TEMPLATES) */
  whatsappTemplate?: string;
  /** Parameters for templates */
  templateParams?: Record<string, string>;
  /** @deprecated Use templateParams instead */
  smsParams?: Record<string, string>;
  /** Override phone number (otherwise fetched from user) */
  phone?: string;
  /** Idempotency key to prevent duplicate notifications */
  idempotencyKey?: string;
  /** Use async queue processing (default: true if queue is enabled) */
  useQueue?: boolean;
}

// Notification types that should trigger SMS by default
// TODO: use this list in createNotification() to auto-send SMS, similar to PUSH_ENABLED_TYPES
const _SMS_ENABLED_TYPES = [
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
  'PRESCRIPTION_UPLOADED',
  'DIAGNOSTIC_BOOKED',
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
  'PRESCRIPTION_UPLOADED',
  'DIAGNOSTIC_BOOKED',
];

// Notification types that should trigger WhatsApp by default
const WHATSAPP_ENABLED_TYPES = [
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
  'PRESCRIPTION_UPLOADED',
  'DIAGNOSTIC_BOOKED',
];

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private notificationQueue: Queue<NotificationJobData> | null = null;
  private fallbackQueue: Queue<FallbackJobData> | null = null;

  constructor(
    private prisma: PrismaService,
    private pushService: PushNotificationService,
    private smsService: SmsService,
    private whatsappService: WhatsAppService,
    private featureFlags: FeatureFlagService,
    @InjectQueue(NOTIFICATION_QUEUE)
    notificationQueue?: Queue<NotificationJobData>,
    @InjectQueue(FALLBACK_QUEUE) fallbackQueue?: Queue<FallbackJobData>,
  ) {
    // Queue may not be available if Redis is not configured
    this.notificationQueue = notificationQueue || null;
    this.fallbackQueue = fallbackQueue || null;
    if (!this.notificationQueue) {
      this.logger.warn(
        'Notification queue not available - notifications will be sent synchronously',
      );
    }
  }

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
      whatsappEnabled?: boolean;
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
    // and attempts push/WhatsApp based on notification type
    return this.sendNotification(data, {
      inApp: true,
      push: PUSH_ENABLED_TYPES.includes(data.type),
      whatsapp: WHATSAPP_ENABLED_TYPES.includes(data.type),
      sms: false, // Don't auto-send SMS from legacy calls - WhatsApp has SMS fallback
    });
  }

  /**
   * Send notification via multiple channels
   * Supports Push, WhatsApp (with SMS fallback), and in-app notifications
   */
  async sendNotification(
    payload: NotificationPayload,
    options: SendNotificationOptions = {
      inApp: true,
      push: true,
      whatsapp: true,
    },
  ): Promise<{
    inAppId?: string;
    pushSent: boolean;
    whatsappSent: boolean;
    smsSent: boolean;
    queued: boolean;
  }> {
    const result = {
      inAppId: undefined as string | undefined,
      pushSent: false,
      whatsappSent: false,
      smsSent: false,
      queued: false,
    };

    // Normalize options - support legacy smsParams
    const templateParams = options.templateParams || options.smsParams || {};

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

    // 1. Create in-app notification (always, if requested - synchronous)
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

    // Check if we should use queue-based processing
    const useQueue =
      options.useQueue !== false &&
      this.featureFlags.isNotificationQueueEnabled() &&
      this.notificationQueue !== null;

    if (useQueue) {
      // Queue the notification for async processing
      try {
        await this.notificationQueue!.add(
          'send-notification',
          {
            userId: payload.userId,
            title: payload.title,
            message: payload.message,
            type: payload.type,
            metadata: payload.metadata,
            options: {
              inApp: false, // Already created above
              push: options.push !== false && categoryEnabled,
              whatsapp: options.whatsapp !== false && categoryEnabled,
              sms: options.sms && categoryEnabled,
              smsTemplate: options.smsTemplate,
              whatsappTemplate: options.whatsappTemplate,
              templateParams,
              phone: options.phone,
              idempotencyKey: options.idempotencyKey,
            },
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
          },
        );
        result.queued = true;
        this.logger.debug(`Notification queued for user ${payload.userId}`);
      } catch (error) {
        this.logger.error(`Failed to queue notification: ${error}`);
        // Fall back to synchronous processing
        await this.sendNotificationSync(
          payload,
          options,
          prefs,
          categoryEnabled,
          result,
        );
      }
    } else {
      // Process synchronously
      await this.sendNotificationSync(
        payload,
        options,
        prefs,
        categoryEnabled,
        result,
      );
    }

    return result;
  }

  /**
   * Send notification synchronously (direct API calls)
   */
  private async sendNotificationSync(
    payload: NotificationPayload,
    options: SendNotificationOptions,
    prefs: Awaited<ReturnType<typeof this.getUserPreferences>>,
    categoryEnabled: boolean,
    result: {
      inAppId?: string;
      pushSent: boolean;
      whatsappSent: boolean;
      smsSent: boolean;
      queued: boolean;
    },
  ): Promise<void> {
    const templateParams = options.templateParams || options.smsParams || {};

    // Get user's phone number if needed for WhatsApp or SMS
    let phone = options.phone;
    if (!phone && (options.whatsapp || options.sms)) {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { phone: true },
      });
      phone = user?.phone;
    }

    // 2. Send push notification (if enabled and preferences allow)
    if (
      options.push !== false &&
      this.featureFlags.isPushNotificationsEnabled() &&
      prefs.pushEnabled &&
      categoryEnabled
    ) {
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

    // 3. Send WhatsApp notification (primary messaging channel)
    if (
      options.whatsapp !== false &&
      phone &&
      this.featureFlags.isWhatsappNotificationsEnabled() &&
      prefs.whatsappEnabled &&
      categoryEnabled
    ) {
      try {
        const templateKey = options.whatsappTemplate || payload.type;
        let whatsappResult;

        if (WHATSAPP_TEMPLATES[templateKey]) {
          whatsappResult = await this.whatsappService.sendTemplatedMessage(
            phone,
            templateKey,
            templateParams,
          );
        } else {
          whatsappResult = await this.whatsappService.sendMessage({
            to: phone,
            body: `${payload.title}\n\n${payload.message}`,
          });
        }

        result.whatsappSent = whatsappResult.success;

        // Schedule SMS fallback if WhatsApp sent but delivery uncertain
        if (
          whatsappResult.success &&
          this.fallbackQueue &&
          options.sms !== false
        ) {
          await this.scheduleFallback(
            payload,
            phone,
            whatsappResult.messageId!,
            options,
            templateParams,
          );
        }
      } catch (error) {
        this.logger.error(`Failed to send WhatsApp notification: ${error}`);
        // Immediately try SMS if WhatsApp failed
        if (
          options.sms !== false &&
          phone &&
          this.featureFlags.isSmsNotificationsEnabled() &&
          prefs.smsEnabled
        ) {
          result.smsSent = await this.sendSmsFallback(
            phone,
            payload,
            options,
            templateParams,
          );
        }
      }
    }
    // 4. Send SMS as primary if WhatsApp is disabled
    else if (
      options.sms &&
      phone &&
      this.featureFlags.isSmsNotificationsEnabled() &&
      prefs.smsEnabled &&
      categoryEnabled
    ) {
      result.smsSent = await this.sendSmsFallback(
        phone,
        payload,
        options,
        templateParams,
      );
    }
  }

  /**
   * Schedule SMS fallback after WhatsApp message
   */
  private async scheduleFallback(
    payload: NotificationPayload,
    phone: string,
    whatsappMessageId: string,
    options: SendNotificationOptions,
    templateParams: Record<string, string>,
  ): Promise<void> {
    if (!this.fallbackQueue) return;

    try {
      // Create a notification log for the WhatsApp message
      const log = await this.prisma.notificationLog.create({
        data: {
          userId: payload.userId,
          eventType: payload.type,
          channel: NotificationChannel.WHATSAPP,
          status: NotificationDeliveryStatus.SENT,
          providerMessageId: whatsappMessageId,
          idempotencyKey: options.idempotencyKey,
          sentAt: new Date(),
        },
      });

      // Schedule fallback job with delay
      await this.fallbackQueue.add(
        'whatsapp-sms-fallback',
        {
          notificationLogId: log.id,
          userId: payload.userId,
          phone,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          smsTemplate: options.smsTemplate,
          templateParams,
          idempotencyKey: options.idempotencyKey,
        },
        {
          delay: WHATSAPP_FALLBACK_DELAY_MS,
          attempts: 1, // Don't retry fallback jobs
        },
      );

      this.logger.debug(
        `Scheduled SMS fallback for WhatsApp message ${whatsappMessageId} in ${WHATSAPP_FALLBACK_DELAY_MS / 1000}s`,
      );
    } catch (error) {
      this.logger.error(`Failed to schedule fallback: ${error}`);
    }
  }

  /**
   * Send SMS as fallback
   */
  private async sendSmsFallback(
    phone: string,
    payload: NotificationPayload,
    options: SendNotificationOptions,
    templateParams: Record<string, string>,
  ): Promise<boolean> {
    try {
      const templateKey = options.smsTemplate || payload.type;

      if (SMS_TEMPLATES[templateKey]) {
        const smsResult = await this.smsService.sendTemplatedSms(
          phone,
          templateKey,
          templateParams,
        );
        return smsResult.success;
      } else {
        const smsResult = await this.smsService.sendSms({
          to: phone,
          body: `${payload.title}: ${payload.message}`.substring(0, 160),
        });
        return smsResult.success;
      }
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error}`);
      return false;
    }
  }

  /**
   * Update notification delivery status from webhook callback
   */
  async updateDeliveryStatus(
    providerMessageId: string,
    status: 'delivered' | 'failed' | 'read',
    errorMessage?: string,
  ): Promise<void> {
    const log = await this.prisma.notificationLog.findFirst({
      where: { providerMessageId },
      orderBy: { createdAt: 'desc' },
    });

    if (!log) {
      this.logger.warn(
        `Notification log not found for message ID: ${providerMessageId}`,
      );
      return;
    }

    const updateData: Record<string, unknown> = {};

    switch (status) {
      case 'delivered':
        updateData.status = NotificationDeliveryStatus.DELIVERED;
        updateData.deliveredAt = new Date();
        break;
      case 'read':
        // Some providers like WhatsApp report read status
        updateData.status = NotificationDeliveryStatus.DELIVERED;
        updateData.deliveredAt = log.deliveredAt || new Date();
        break;
      case 'failed':
        updateData.status = NotificationDeliveryStatus.FAILED;
        updateData.failedAt = new Date();
        updateData.errorMessage = errorMessage;
        break;
    }

    await this.prisma.notificationLog.update({
      where: { id: log.id },
      data: updateData,
    });

    this.logger.log(
      `Updated delivery status for ${providerMessageId}: ${status}`,
    );
  }

  /**
   * Get notification logs for a user
   */
  async getNotificationLogs(
    userId: string,
    options?: {
      channel?: NotificationChannel;
      limit?: number;
    },
  ) {
    return this.prisma.notificationLog.findMany({
      where: {
        userId,
        channel: options?.channel,
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
    });
  }

  /**
   * Send notification to multiple users
   */
  async sendBulkNotification(
    userIds: string[],
    payload: Omit<NotificationPayload, 'userId'>,
    options: SendNotificationOptions = {
      inApp: true,
      push: true,
      whatsapp: true,
    },
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

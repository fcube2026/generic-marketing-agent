import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PushNotificationService } from '../push-notifications/push-notification.service';
import { SmsService, SMS_TEMPLATES } from '../sms/sms.service';
import {
  WhatsAppService,
  WHATSAPP_TEMPLATES,
} from '../whatsapp/whatsapp.service';
import { FeatureFlagService } from '../../common/feature-flags/feature-flags.service';
import { NOTIFICATION_QUEUE } from '../../common/queue/queue.module';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
} from '@prisma/client';

export interface NotificationJobData {
  userId: string;
  title: string;
  message: string;
  type: string;
  metadata?: Record<string, unknown>;
  options: {
    inApp?: boolean;
    push?: boolean;
    whatsapp?: boolean;
    sms?: boolean;
    smsTemplate?: string;
    whatsappTemplate?: string;
    templateParams?: Record<string, string>;
    phone?: string;
    idempotencyKey?: string;
  };
}

@Injectable()
@Processor(NOTIFICATION_QUEUE)
export class NotificationQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationQueueProcessor.name);

  constructor(
    private prisma: PrismaService,
    private pushService: PushNotificationService,
    private smsService: SmsService,
    private whatsappService: WhatsAppService,
    private featureFlags: FeatureFlagService,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    this.logger.log(
      `Processing notification job ${job.id} for user ${job.data.userId}`,
    );

    const { userId, title, message, type, metadata, options } = job.data;

    // Check idempotency - don't process duplicate notifications
    if (options.idempotencyKey) {
      const existingLog = await this.prisma.notificationLog.findFirst({
        where: {
          idempotencyKey: options.idempotencyKey,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      if (existingLog) {
        this.logger.log(
          `Skipping duplicate notification with key ${options.idempotencyKey}`,
        );
        return;
      }
    }

    // Get user preferences
    let prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      prefs = await this.prisma.notificationPreference.create({
        data: { userId },
      });
    }

    // Get user phone number if needed
    let phone = options.phone;
    if (!phone && (options.whatsapp || options.sms)) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true },
      });
      phone = user?.phone;
    }

    // 1. Send Push Notification
    if (
      options.push !== false &&
      this.featureFlags.isPushNotificationsEnabled() &&
      prefs.pushEnabled
    ) {
      await this.sendPushNotification(
        userId,
        title,
        message,
        type,
        metadata,
        options,
      );
    }

    // 2. Send WhatsApp (primary messaging channel)
    if (
      options.whatsapp !== false &&
      phone &&
      this.featureFlags.isWhatsappNotificationsEnabled() &&
      prefs.whatsappEnabled
    ) {
      await this.sendWhatsAppNotification(
        userId,
        phone,
        title,
        message,
        type,
        options,
      );
    }
    // 3. Fallback to SMS if WhatsApp is disabled or user opted out
    else if (
      options.sms !== false &&
      phone &&
      this.featureFlags.isSmsNotificationsEnabled() &&
      prefs.smsEnabled
    ) {
      await this.sendSmsNotification(
        userId,
        phone,
        title,
        message,
        type,
        options,
      );
    }
  }

  private async sendPushNotification(
    userId: string,
    title: string,
    message: string,
    type: string,
    metadata: Record<string, unknown> | undefined,
    options: NotificationJobData['options'],
  ): Promise<void> {
    const logId = await this.createNotificationLog(
      userId,
      type,
      NotificationChannel.PUSH,
      options.idempotencyKey,
    );

    try {
      const unreadCount = await this.pushService.getUnreadBadgeCount(userId);
      const result = await this.pushService.sendToUser({
        userId,
        title,
        body: message,
        data: { type, ...metadata },
        badge: unreadCount + 1,
      });

      await this.updateNotificationLog(logId, {
        status: result.success
          ? NotificationDeliveryStatus.SENT
          : NotificationDeliveryStatus.FAILED,
        sentAt: result.success ? new Date() : undefined,
        failedAt: result.success ? undefined : new Date(),
        errorMessage: result.errors?.join(', '),
        providerMessageId: result.ticketIds?.join(','),
      });
    } catch (error) {
      this.logger.error(`Push notification failed: ${error}`);
      await this.updateNotificationLog(logId, {
        status: NotificationDeliveryStatus.FAILED,
        failedAt: new Date(),
        errorMessage: String(error),
      });
    }
  }

  private async sendWhatsAppNotification(
    userId: string,
    phone: string,
    title: string,
    message: string,
    type: string,
    options: NotificationJobData['options'],
  ): Promise<void> {
    const logId = await this.createNotificationLog(
      userId,
      type,
      NotificationChannel.WHATSAPP,
      options.idempotencyKey,
    );

    try {
      let result;
      const templateKey = options.whatsappTemplate || type;

      if (WHATSAPP_TEMPLATES[templateKey] && options.templateParams) {
        result = await this.whatsappService.sendTemplatedMessage(
          phone,
          templateKey,
          options.templateParams,
        );
      } else {
        // Fallback to plain message
        result = await this.whatsappService.sendMessage({
          to: phone,
          body: `${title}\n\n${message}`,
        });
      }

      await this.updateNotificationLog(logId, {
        status: result.success
          ? NotificationDeliveryStatus.SENT
          : NotificationDeliveryStatus.FAILED,
        sentAt: result.success ? new Date() : undefined,
        failedAt: result.success ? undefined : new Date(),
        errorMessage: result.error,
        providerMessageId: result.messageId,
      });
    } catch (error) {
      this.logger.error(`WhatsApp notification failed: ${error}`);
      await this.updateNotificationLog(logId, {
        status: NotificationDeliveryStatus.FAILED,
        failedAt: new Date(),
        errorMessage: String(error),
      });
    }
  }

  private async sendSmsNotification(
    userId: string,
    phone: string,
    title: string,
    message: string,
    type: string,
    options: NotificationJobData['options'],
  ): Promise<void> {
    const logId = await this.createNotificationLog(
      userId,
      type,
      NotificationChannel.SMS,
      options.idempotencyKey,
    );

    try {
      let result;
      const templateKey = options.smsTemplate || type;

      if (SMS_TEMPLATES[templateKey] && options.templateParams) {
        result = await this.smsService.sendTemplatedSms(
          phone,
          templateKey,
          options.templateParams,
        );
      } else {
        // Fallback to truncated message
        result = await this.smsService.sendSms({
          to: phone,
          body: `${title}: ${message}`.substring(0, 160),
        });
      }

      await this.updateNotificationLog(logId, {
        status: result.success
          ? NotificationDeliveryStatus.SENT
          : NotificationDeliveryStatus.FAILED,
        sentAt: result.success ? new Date() : undefined,
        failedAt: result.success ? undefined : new Date(),
        errorMessage: result.error,
        providerMessageId: result.messageId,
      });
    } catch (error) {
      this.logger.error(`SMS notification failed: ${error}`);
      await this.updateNotificationLog(logId, {
        status: NotificationDeliveryStatus.FAILED,
        failedAt: new Date(),
        errorMessage: String(error),
      });
    }
  }

  private async createNotificationLog(
    userId: string,
    eventType: string,
    channel: NotificationChannel,
    idempotencyKey?: string,
  ): Promise<string> {
    const log = await this.prisma.notificationLog.create({
      data: {
        userId,
        eventType,
        channel,
        status: NotificationDeliveryStatus.PENDING,
        idempotencyKey,
      },
    });
    return log.id;
  }

  private async updateNotificationLog(
    logId: string,
    data: {
      status: NotificationDeliveryStatus;
      sentAt?: Date;
      deliveredAt?: Date;
      failedAt?: Date;
      errorMessage?: string;
      providerMessageId?: string;
    },
  ): Promise<void> {
    await this.prisma.notificationLog.update({
      where: { id: logId },
      data,
    });
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed for user ${job.data.userId}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} failed for user ${job.data.userId}: ${error.message}`,
    );
  }
}

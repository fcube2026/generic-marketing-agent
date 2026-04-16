import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SmsService, SMS_TEMPLATES } from '../sms/sms.service';
import { FeatureFlagService } from '../../common/feature-flags/feature-flags.service';
import { FALLBACK_QUEUE } from '../../common/queue/queue.module';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
} from '@prisma/client';

export interface FallbackJobData {
  notificationLogId: string;
  userId: string;
  phone: string;
  title: string;
  message: string;
  type: string;
  smsTemplate?: string;
  templateParams?: Record<string, string>;
  idempotencyKey?: string;
}

// Delay for WhatsApp→SMS fallback (5 minutes)
export const WHATSAPP_FALLBACK_DELAY_MS = 5 * 60 * 1000;

@Injectable()
@Processor(FALLBACK_QUEUE)
export class FallbackQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(FallbackQueueProcessor.name);

  constructor(
    private prisma: PrismaService,
    private smsService: SmsService,
    private featureFlags: FeatureFlagService,
  ) {
    super();
  }

  async process(job: Job<FallbackJobData>): Promise<void> {
    const {
      notificationLogId,
      userId,
      phone,
      title,
      message,
      type,
      smsTemplate,
      templateParams,
      idempotencyKey,
    } = job.data;

    this.logger.log(
      `Processing fallback job ${job.id} for notification log ${notificationLogId}`,
    );

    // Check if SMS notifications are enabled
    if (!this.featureFlags.isSmsNotificationsEnabled()) {
      this.logger.log(
        'SMS notifications are disabled globally, skipping fallback',
      );
      return;
    }

    // Check user preferences
    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs?.smsEnabled) {
      this.logger.log(`User ${userId} has SMS disabled, skipping fallback`);
      return;
    }

    // Check if the WhatsApp message was delivered
    const whatsappLog = await this.prisma.notificationLog.findUnique({
      where: { id: notificationLogId },
    });

    if (!whatsappLog) {
      this.logger.warn(
        `WhatsApp notification log ${notificationLogId} not found`,
      );
      return;
    }

    // If WhatsApp was delivered successfully, no fallback needed
    if (whatsappLog.status === NotificationDeliveryStatus.DELIVERED) {
      this.logger.log(
        `WhatsApp message ${notificationLogId} was delivered, no fallback needed`,
      );
      return;
    }

    // If WhatsApp is still pending after 5 minutes, or if it failed, send SMS
    if (
      whatsappLog.status === NotificationDeliveryStatus.PENDING ||
      whatsappLog.status === NotificationDeliveryStatus.SENT ||
      whatsappLog.status === NotificationDeliveryStatus.FAILED
    ) {
      this.logger.log(
        `Triggering SMS fallback for WhatsApp message ${notificationLogId} (status: ${whatsappLog.status})`,
      );

      // Mark the original WhatsApp log as fallback triggered
      await this.prisma.notificationLog.update({
        where: { id: notificationLogId },
        data: { status: NotificationDeliveryStatus.FALLBACK_TRIGGERED },
      });

      // Check for duplicate SMS (idempotency within 24 hours)
      const smsFallbackKey = idempotencyKey
        ? `${idempotencyKey}_sms_fallback`
        : undefined;

      if (smsFallbackKey) {
        const existingSmsLog = await this.prisma.notificationLog.findFirst({
          where: {
            idempotencyKey: smsFallbackKey,
            channel: NotificationChannel.SMS,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        });

        if (existingSmsLog) {
          this.logger.log(
            `Skipping duplicate SMS fallback with key ${smsFallbackKey}`,
          );
          return;
        }
      }

      // Create SMS notification log
      const smsLog = await this.prisma.notificationLog.create({
        data: {
          userId,
          eventType: type,
          channel: NotificationChannel.SMS,
          status: NotificationDeliveryStatus.PENDING,
          idempotencyKey: smsFallbackKey,
          metadata: { fallbackFrom: notificationLogId },
        },
      });

      // Send SMS
      try {
        let result;
        const templateKey = smsTemplate || type;

        if (SMS_TEMPLATES[templateKey] && templateParams) {
          result = await this.smsService.sendTemplatedSms(
            phone,
            templateKey,
            templateParams,
          );
        } else {
          result = await this.smsService.sendSms({
            to: phone,
            body: `${title}: ${message}`.substring(0, 160),
          });
        }

        await this.prisma.notificationLog.update({
          where: { id: smsLog.id },
          data: {
            status: result.success
              ? NotificationDeliveryStatus.SENT
              : NotificationDeliveryStatus.FAILED,
            sentAt: result.success ? new Date() : undefined,
            failedAt: result.success ? undefined : new Date(),
            errorMessage: result.error,
            providerMessageId: result.messageId,
          },
        });

        this.logger.log(
          `SMS fallback ${result.success ? 'sent' : 'failed'} for user ${userId}`,
        );
      } catch (error) {
        this.logger.error(`SMS fallback failed: ${error}`);
        await this.prisma.notificationLog.update({
          where: { id: smsLog.id },
          data: {
            status: NotificationDeliveryStatus.FAILED,
            failedAt: new Date(),
            errorMessage: String(error),
          },
        });
      }
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Fallback job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Fallback job ${job.id} failed: ${error.message}`);
  }
}

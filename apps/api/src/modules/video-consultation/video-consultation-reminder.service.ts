import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { REMINDER_QUEUE } from '../../common/queue/queue.module';

export interface VideoReminderJobData {
  bookingId: string;
  patientUserId: string;
  providerUserId: string;
  providerName: string;
  patientName: string;
  reminderType: '5min' | '1min';
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const ONE_MINUTE_MS = 1 * 60 * 1000;

@Injectable()
export class VideoConsultationReminderService {
  private readonly logger = new Logger(VideoConsultationReminderService.name);
  private reminderQueue: Queue<VideoReminderJobData> | null = null;

  constructor(
    @Optional()
    @InjectQueue(REMINDER_QUEUE)
    reminderQueue?: Queue<VideoReminderJobData>,
  ) {
    this.reminderQueue = reminderQueue || null;
    if (!this.reminderQueue) {
      this.logger.warn(
        'Reminder queue not available — video consultation reminders will be disabled.',
      );
    }
  }

  async scheduleReminders(
    bookingId: string,
    scheduledAt: Date,
    patientUserId: string,
    providerUserId: string,
    providerName: string,
    patientName: string,
  ): Promise<void> {
    if (!this.reminderQueue) {
      this.logger.warn(
        `Cannot schedule reminders for booking ${bookingId} — reminder queue not available.`,
      );
      return;
    }

    const now = Date.now();
    const sessionStart = scheduledAt.getTime();
    const delay5min = sessionStart - FIVE_MINUTES_MS - now;
    const delay1min = sessionStart - ONE_MINUTE_MS - now;

    if (delay5min > 0) {
      await this.reminderQueue.add(
        'video-reminder',
        {
          bookingId,
          patientUserId,
          providerUserId,
          providerName,
          patientName,
          reminderType: '5min',
        },
        {
          delay: delay5min,
          jobId: `video-reminder-5min-${bookingId}`,
          attempts: 2,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: 50,
        },
      );
      this.logger.log(
        `Scheduled 5-min video reminder for booking ${bookingId} in ${Math.round(delay5min / 1000)}s`,
      );
    } else {
      this.logger.warn(
        `Skipping 5-min reminder for booking ${bookingId} — session starts too soon or has already passed.`,
      );
    }

    if (delay1min > 0) {
      await this.reminderQueue.add(
        'video-reminder',
        {
          bookingId,
          patientUserId,
          providerUserId,
          providerName,
          patientName,
          reminderType: '1min',
        },
        {
          delay: delay1min,
          jobId: `video-reminder-1min-${bookingId}`,
          attempts: 2,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: 50,
        },
      );
      this.logger.log(
        `Scheduled 1-min video reminder for booking ${bookingId} in ${Math.round(delay1min / 1000)}s`,
      );
    } else {
      this.logger.warn(
        `Skipping 1-min reminder for booking ${bookingId} — session starts too soon or has already passed.`,
      );
    }
  }

  async cancelReminders(bookingId: string): Promise<void> {
    if (!this.reminderQueue) {
      return;
    }

    const jobIds = [
      `video-reminder-5min-${bookingId}`,
      `video-reminder-1min-${bookingId}`,
    ];

    for (const jobId of jobIds) {
      try {
        const job = await this.reminderQueue.getJob(jobId);
        if (job) {
          await job.remove();
          this.logger.log(
            `Cancelled video reminder job ${jobId} for booking ${bookingId}`,
          );
        }
      } catch (error) {
        this.logger.error(`Failed to cancel reminder job ${jobId}: ${error}`);
      }
    }
  }
}

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
      this.logger.warn(`Cannot schedule reminders for booking ${bookingId} — queue unavailable.`);
      return;
    }

    const now = Date.now();
    const sessionStart = scheduledAt.getTime();
    const diffMs = sessionStart - now;

    // RULE: If booking is scheduled for "NOW" (current time or within 30 seconds)
    // or already started, skip all reminders.
    if (diffMs < 30000) {
      this.logger.log(`Skipping reminders for booking ${bookingId} — session is immediate or already started.`);
      return;
    }

    const delay5min = diffMs - FIVE_MINUTES_MS;
    const delay1min = diffMs - ONE_MINUTE_MS;

    // Schedule 5-minute reminder ONLY if session is >= 5 minutes away
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
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
        },
      );
      this.logger.log(`Scheduled 5-min reminder for ${bookingId} in ${Math.round(delay5min / 1000)}s`);
    }

    // Schedule 1-minute reminder ONLY if session is >= 1 minute away
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
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
        },
      );
      this.logger.log(`Scheduled 1-min reminder for ${bookingId} in ${Math.round(delay1min / 1000)}s`);
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

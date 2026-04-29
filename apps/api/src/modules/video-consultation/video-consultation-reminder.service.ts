import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { REMINDER_QUEUE } from '../../common/queue/queue.module';
import { NotificationsService } from '../notifications/notifications.service';

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
  private activeTimeouts: Map<string, NodeJS.Timeout[]> = new Map();

  constructor(
    @Optional()
    @InjectQueue(REMINDER_QUEUE)
    reminderQueue: Queue<VideoReminderJobData> | null,
    private readonly notificationsService: NotificationsService,
  ) {
    this.reminderQueue = reminderQueue || null;
    if (!this.reminderQueue) {
      this.logger.warn(
        'Reminder queue not available — using setTimeout fallback for video consultation reminders.',
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
    const now = Date.now();
    const sessionStart = scheduledAt.getTime();
    const diffMs = sessionStart - now;

    // RULE: If booking is scheduled for "NOW" (current time or within 30 seconds)
    // or already started, skip all reminders.
    if (diffMs < 30000) {
      this.logger.log(
        `Skipping reminders for booking ${bookingId} — session is immediate or already started.`,
      );
      return;
    }

    const delay5min = diffMs - FIVE_MINUTES_MS;
    const delay1min = diffMs - ONE_MINUTE_MS;

    if (this.reminderQueue) {
      // Redis Mode
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
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
          },
        );
      }
    } else {
      // Fallback Mode (Development)
      const timeouts: NodeJS.Timeout[] = [];
      if (delay5min > 0) {
        const t = setTimeout(
          () =>
            this.sendDirectReminder(
              bookingId,
              patientUserId,
              providerUserId,
              providerName,
              patientName,
              '5min',
            ),
          delay5min,
        );
        timeouts.push(t);
      }
      if (delay1min > 0) {
        const t = setTimeout(
          () =>
            this.sendDirectReminder(
              bookingId,
              patientUserId,
              providerUserId,
              providerName,
              patientName,
              '1min',
            ),
          delay1min,
        );
        timeouts.push(t);
      }
      this.activeTimeouts.set(bookingId, timeouts);
    }

    this.logger.log(
      `Scheduled ${this.reminderQueue ? 'Redis' : 'Fallback'} reminders for ${bookingId}`,
    );
  }

  private async sendDirectReminder(
    bookingId: string,
    patientUserId: string,
    providerUserId: string,
    providerName: string,
    patientName: string,
    reminderType: '5min' | '1min',
  ) {
    const is5min = reminderType === '5min';
    const data = {
      type: 'VIDEO_CONSULTATION_REMINDER',
      bookingId,
      screen: 'VideoLobby',
    };

    const patientTitle = is5min
      ? '🎥 Video Consultation in 5 Mins'
      : '🎥 Join Video Consultation Now';
    const patientMsg = is5min
      ? `Your session with Dr. ${providerName} starts in 5 minutes.`
      : `Dr. ${providerName} is ready. Tap to join now.`;

    const providerTitle = is5min
      ? '🎥 Video Consultation in 5 Mins'
      : '🎥 Join Video Consultation Now';
    const providerMsg = is5min
      ? `Your session with ${patientName} starts in 5 minutes.`
      : `Your session with ${patientName} is ready. Tap to join now.`;

    await Promise.all([
      this.notificationsService.sendNotification(
        {
          userId: patientUserId,
          title: patientTitle,
          message: patientMsg,
          type: 'VIDEO_CONSULTATION_REMINDER',
          metadata: data,
        },
        { inApp: true, push: true },
      ),
      this.notificationsService.sendNotification(
        {
          userId: providerUserId,
          title: providerTitle,
          message: providerMsg,
          type: 'VIDEO_CONSULTATION_REMINDER',
          metadata: data,
        },
        { inApp: true, push: true },
      ),
    ]);
    this.logger.log(
      `Sent direct ${reminderType} reminder for booking ${bookingId}`,
    );
  }

  async cancelReminders(bookingId: string): Promise<void> {
    if (this.reminderQueue) {
      const jobIds = [
        `video-reminder-5min-${bookingId}`,
        `video-reminder-1min-${bookingId}`,
      ];
      for (const jobId of jobIds) {
        const job = await this.reminderQueue.getJob(jobId);
        if (job) {
          try {
            await job.remove();
          } catch (err) {
            this.logger.warn(
              `Failed to remove reminder job ${jobId}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      }
    } else {
      const timeouts = this.activeTimeouts.get(bookingId);
      if (timeouts) {
        timeouts.forEach(clearTimeout);
        this.activeTimeouts.delete(bookingId);
      }
    }
  }
}

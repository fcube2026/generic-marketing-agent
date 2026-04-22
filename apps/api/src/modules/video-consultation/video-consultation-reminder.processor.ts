import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { REMINDER_QUEUE } from '../../common/queue/queue.module';
import { NotificationsService } from '../notifications/notifications.service';
import { VideoReminderJobData } from './video-consultation-reminder.service';

@Injectable()
@Processor(REMINDER_QUEUE)
export class VideoConsultationReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoConsultationReminderProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job<VideoReminderJobData>): Promise<void> {
    // This processor is registered for the entire REMINDER_QUEUE, which may
    // carry other job types in the future (e.g. appointment-level reminders
    // added by AppointmentReminderScheduler).  Only 'video-reminder' jobs are
    // handled here; all other job names are intentionally skipped so that
    // separate processors can handle them without contention.
    if (job.name !== 'video-reminder') {
      return;
    }

    const {
      bookingId,
      patientUserId,
      providerUserId,
      providerName,
      patientName,
      reminderType,
    } = job.data;

    const deepLink = `/consultation/lobby/${bookingId}`;
    // Mobile navigation expects 'VideoLobby' screen name in data payload
    const data = { 
      type: 'VIDEO_CONSULTATION_REMINDER',
      bookingId,
      screen: 'VideoLobby',
      deepLink 
    };

    const is5min = reminderType === '5min';

    const patientTitle = is5min
      ? '🎥 Video Consultation in 5 Mins'
      : '🎥 Join Video Consultation Now';
    const patientMessage = is5min
      ? `Your session with Dr. ${providerName} starts in 5 minutes. Tap to prepare.`
      : `Dr. ${providerName} is ready. Tap to join the video lobby now. ➔`;

    const providerTitle = is5min
      ? '🎥 Video Consultation in 5 Mins'
      : '🎥 Join Video Consultation Now';
    const providerMessage = is5min
      ? `Your session with ${patientName} starts in 5 minutes.`
      : `Your session with ${patientName} is ready. Tap to join now. ➔`;

    try {
      await this.notificationsService.sendNotification(
        {
          userId: patientUserId,
          title: patientTitle,
          message: patientMessage,
          type: 'VIDEO_CONSULTATION_REMINDER',
          metadata: data,
        },
        {
          inApp: true,
          push: true,
          idempotencyKey: `${job.id}-patient`,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to notify patient for booking ${bookingId}: ${error}`);
    }

    try {
      await this.notificationsService.sendNotification(
        {
          userId: providerUserId,
          title: providerTitle,
          message: providerMessage,
          type: 'VIDEO_CONSULTATION_REMINDER',
          metadata: data,
        },
        {
          inApp: true,
          push: true,
          idempotencyKey: `${job.id}-provider`,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to notify provider for booking ${bookingId}: ${error}`);
    }

    this.logger.log(`Processed ${reminderType} reminder for booking ${bookingId}`);
  }
}

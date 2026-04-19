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
    const metadata = { bookingId, deepLink };
    const is5min = reminderType === '5min';

    const patientTitle = is5min
      ? 'Video Consultation Starting Soon'
      : 'Video Consultation Starting Now';
    const patientMessage = is5min
      ? `Your video consultation with Dr. ${providerName} starts in 5 minutes. Make sure you have a stable internet connection.`
      : 'Your video consultation is about to start. Tap to join the waiting room.';

    const providerTitle = is5min
      ? 'Video Consultation Starting Soon'
      : 'Video Consultation Starting Now';
    const providerMessage = is5min
      ? `Your video consultation with ${patientName} starts in 5 minutes.`
      : `Your video consultation with ${patientName} is about to start.`;

    try {
      await this.notificationsService.sendNotification(
        {
          userId: patientUserId,
          title: patientTitle,
          message: patientMessage,
          type: 'VIDEO_CONSULTATION_REMINDER',
          metadata,
        },
        {
          inApp: true,
          push: true,
          idempotencyKey: `${job.id}-patient`,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send patient reminder for booking ${bookingId}: ${error}`,
      );
    }

    try {
      await this.notificationsService.sendNotification(
        {
          userId: providerUserId,
          title: providerTitle,
          message: providerMessage,
          type: 'VIDEO_CONSULTATION_REMINDER',
          metadata,
        },
        {
          inApp: true,
          push: true,
          idempotencyKey: `${job.id}-provider`,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send provider reminder for booking ${bookingId}: ${error}`,
      );
    }

    this.logger.log(
      `Processed ${reminderType} video reminder for booking ${bookingId}`,
    );
  }
}

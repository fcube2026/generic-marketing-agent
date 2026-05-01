import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { FeatureFlagService } from '../../common/feature-flags/feature-flags.service';

@Injectable()
export class AppointmentReminderScheduler {
  private readonly logger = new Logger(AppointmentReminderScheduler.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private featureFlags: FeatureFlagService,
  ) {}

  /**
   * Send reminders for appointments in the next 24 hours
   * Runs every hour at minute 0
   */
  @Cron(CronExpression.EVERY_HOUR)
  async send24HourReminders() {
    if (!this.featureFlags.isAppointmentRemindersEnabled()) {
      return;
    }

    this.logger.log('Running 24-hour appointment reminder job');

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // Find bookings scheduled in the next 24-25 hours that haven't been reminded
    const bookings = await this.prisma.booking.findMany({
      where: {
        scheduledAt: {
          gte: in24Hours,
          lt: in25Hours,
        },
        status: {
          in: ['ACCEPTED'],
        },
      },
      include: {
        patient: { include: { user: true } },
        provider: { include: { user: true } },
      },
    });

    this.logger.log(`Found ${bookings.length} bookings for 24-hour reminders`);

    for (const booking of bookings) {
      try {
        const scheduledTime = this.formatScheduledTime(booking.scheduledAt);

        // Send reminder to patient
        await this.notificationsService.sendNotification(
          {
            userId: booking.patient.userId,
            title: 'Appointment Reminder',
            message: `Reminder: Your appointment with Dr. ${booking.provider.name} is scheduled for tomorrow at ${scheduledTime}.`,
            type: 'APPOINTMENT_REMINDER',
            metadata: { bookingId: booking.id, reminderType: '24h' },
          },
          {
            inApp: true,
            push: true,
            whatsapp: true,
            sms: false, // WhatsApp will fallback to SMS if needed
            whatsappTemplate: 'APPOINTMENT_REMINDER',
            smsTemplate: 'APPOINTMENT_REMINDER',
            templateParams: {
              providerName: booking.provider.name,
              scheduledTime,
            },
            idempotencyKey: `reminder_24h_${booking.id}`,
          },
        );

        // Send reminder to provider
        await this.notificationsService.sendNotification(
          {
            userId: booking.provider.userId,
            title: 'Upcoming Appointment',
            message: `Reminder: You have an appointment with ${booking.patient.name} tomorrow at ${scheduledTime}.`,
            type: 'PROVIDER_APPOINTMENT_REMINDER',
            metadata: { bookingId: booking.id, reminderType: '24h' },
          },
          {
            inApp: true,
            push: true,
            whatsapp: true,
            sms: false,
            whatsappTemplate: 'PROVIDER_APPOINTMENT_REMINDER',
            smsTemplate: 'PROVIDER_APPOINTMENT_REMINDER',
            templateParams: {
              patientName: booking.patient.name,
              scheduledTime,
            },
            idempotencyKey: `reminder_24h_provider_${booking.id}`,
          },
        );
      } catch (error) {
        this.logger.error(
          `Failed to send 24h reminder for booking ${booking.id}: ${error}`,
        );
      }
    }
  }

  /**
   * Send reminders for appointments in the next hour
   * Runs every 15 minutes
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async send1HourReminders() {
    if (!this.featureFlags.isAppointmentRemindersEnabled()) {
      return;
    }

    this.logger.log('Running 1-hour appointment reminder job');

    const now = new Date();
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
    const in90Minutes = new Date(now.getTime() + 90 * 60 * 1000);

    // Find bookings scheduled in 1-1.5 hours
    const bookings = await this.prisma.booking.findMany({
      where: {
        scheduledAt: {
          gte: in1Hour,
          lt: in90Minutes,
        },
        status: {
          in: ['ACCEPTED'],
        },
      },
      include: {
        patient: { include: { user: true } },
        provider: { include: { user: true } },
      },
    });

    this.logger.log(`Found ${bookings.length} bookings for 1-hour reminders`);

    for (const booking of bookings) {
      try {
        const scheduledTime = this.formatScheduledTime(booking.scheduledAt);

        // Send reminder to patient
        await this.notificationsService.sendNotification(
          {
            userId: booking.patient.userId,
            title: 'Appointment Starting Soon',
            message: `Your appointment with Dr. ${booking.provider.name} starts in about 1 hour at ${scheduledTime}.`,
            type: 'APPOINTMENT_REMINDER',
            metadata: { bookingId: booking.id, reminderType: '1h' },
          },
          {
            inApp: true,
            push: true,
            whatsapp: true,
            sms: false,
            whatsappTemplate: 'APPOINTMENT_REMINDER',
            smsTemplate: 'APPOINTMENT_REMINDER',
            templateParams: {
              providerName: booking.provider.name,
              scheduledTime,
            },
            idempotencyKey: `reminder_1h_${booking.id}`,
          },
        );

        // Send reminder to provider
        await this.notificationsService.sendNotification(
          {
            userId: booking.provider.userId,
            title: 'Appointment Starting Soon',
            message: `Your appointment with ${booking.patient.name} starts in about 1 hour at ${scheduledTime}.`,
            type: 'PROVIDER_APPOINTMENT_REMINDER',
            metadata: { bookingId: booking.id, reminderType: '1h' },
          },
          {
            inApp: true,
            push: true,
            whatsapp: true,
            sms: false,
            whatsappTemplate: 'PROVIDER_APPOINTMENT_REMINDER',
            smsTemplate: 'PROVIDER_APPOINTMENT_REMINDER',
            templateParams: {
              patientName: booking.patient.name,
              scheduledTime,
            },
            idempotencyKey: `reminder_1h_provider_${booking.id}`,
          },
        );
      } catch (error) {
        this.logger.error(
          `Failed to send 1h reminder for booking ${booking.id}: ${error}`,
        );
      }
    }
  }

  /**
   * Send short-window reminders for scheduled VIDEO_CONSULTATION bookings.
   *
   * Runs every minute and fires three types of reminder:
   *   • 5-minute warning  — when scheduledAt is 4-6 minutes away
   *   • 1-minute warning  — when scheduledAt is 0-2 minutes away
   *   • Start-time alert  — when scheduledAt is within the last minute (0 to -1 min)
   *
   * Each reminder uses an idempotency key so it is sent only once per booking
   * even if the cron overlaps at a boundary.
   *
   * Only applies to scheduled (non-instant) VIDEO_CONSULTATION bookings.
   * Instant bookings are identified by having a null scheduledAt or a
   * scheduledAt within 2 minutes of createdAt.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async sendVideoConsultationShortReminders() {
    if (!this.featureFlags.isAppointmentRemindersEnabled()) {
      return;
    }

    const now = new Date();

    // Window bounds (in ms)
    const FIVE_MIN_LOW = now.getTime() + 4 * 60 * 1000; // 4 min from now
    const FIVE_MIN_HIGH = now.getTime() + 6 * 60 * 1000; // 6 min from now
    const ONE_MIN_LOW = now.getTime() + 0 * 60 * 1000; // now
    const ONE_MIN_HIGH = now.getTime() + 2 * 60 * 1000; // 2 min from now
    const START_LOW = now.getTime() - 1 * 60 * 1000; // 1 min ago
    const START_HIGH = now.getTime() + 0 * 60 * 1000; // now

    // Fetch bookings in the widest window (4-6 min) and narrow ones (0-2 min, -1-0 min)
    const bookings = await this.prisma.booking.findMany({
      where: {
        mode: 'VIDEO_CONSULTATION',
        status: { in: ['ACCEPTED'] },
        scheduledAt: {
          gte: new Date(START_LOW),
          lt: new Date(FIVE_MIN_HIGH),
        },
      },
      include: {
        patient: { include: { user: true } },
        provider: { include: { user: true } },
      },
    });

    for (const booking of bookings) {
      // Skip instant bookings (scheduledAt within 2 minutes of createdAt)
      if (
        booking.scheduledAt &&
        booking.createdAt &&
        booking.scheduledAt.getTime() - booking.createdAt.getTime() <
          2 * 60 * 1000
      ) {
        continue;
      }

      const ts = booking.scheduledAt ? booking.scheduledAt.getTime() : null;
      if (!ts) continue;

      try {
        if (ts >= FIVE_MIN_LOW && ts < FIVE_MIN_HIGH) {
          // 5-minute reminder
          await this.sendVideoReminderPair(booking, {
            patientTitle: 'Consultation in 5 Minutes',
            patientMessage: `Your video consultation with Dr. ${booking.provider.name} will start in 5 minutes.`,
            providerTitle: 'Consultation in 5 Minutes',
            providerMessage: `Your video consultation with patient ${booking.patient.name} will start in 5 minutes.`,
            reminderType: '5min',
          });
        }

        if (ts >= ONE_MIN_LOW && ts < ONE_MIN_HIGH) {
          // 1-minute reminder
          await this.sendVideoReminderPair(booking, {
            patientTitle: 'Consultation About to Start',
            patientMessage: `Your video consultation with Dr. ${booking.provider.name} is about to start. Join now.`,
            providerTitle: 'Consultation About to Start',
            providerMessage: `Your video consultation with patient ${booking.patient.name} is about to start. Join now.`,
            reminderType: '1min',
          });
        }

        if (ts >= START_LOW && ts < START_HIGH) {
          // At-start-time alert
          await this.sendVideoReminderPair(booking, {
            patientTitle: 'Consultation Has Started',
            patientMessage: `Your video consultation with Dr. ${booking.provider.name} has started. Join now.`,
            providerTitle: 'Consultation Has Started',
            providerMessage: `Your video consultation with patient ${booking.patient.name} has started. Join now.`,
            reminderType: 'start',
          });
        }
      } catch (error) {
        this.logger.error(
          `Failed to send video short-reminder for booking ${booking.id}: ${error}`,
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async sendVideoReminderPair(
    booking: {
      id: string;
      patient: { userId: string; name: string };
      provider: { userId: string; name: string };
    },
    opts: {
      patientTitle: string;
      patientMessage: string;
      providerTitle: string;
      providerMessage: string;
      reminderType: string;
    },
  ) {
    const {
      patientTitle,
      patientMessage,
      providerTitle,
      providerMessage,
      reminderType,
    } = opts;

    await this.notificationsService.sendNotification(
      {
        userId: booking.patient.userId,
        title: patientTitle,
        message: patientMessage,
        type: 'VIDEO_CONSULTATION_REMINDER',
        metadata: { bookingId: booking.id, reminderType },
      },
      {
        inApp: true,
        push: true,
        whatsapp: false,
        sms: false,
        idempotencyKey: `video_reminder_${reminderType}_patient_${booking.id}`,
      },
    );

    await this.notificationsService.sendNotification(
      {
        userId: booking.provider.userId,
        title: providerTitle,
        message: providerMessage,
        type: 'VIDEO_CONSULTATION_REMINDER',
        metadata: { bookingId: booking.id, reminderType },
      },
      {
        inApp: true,
        push: true,
        whatsapp: false,
        sms: false,
        idempotencyKey: `video_reminder_${reminderType}_provider_${booking.id}`,
      },
    );
  }

  private formatScheduledTime(date: Date): string {
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

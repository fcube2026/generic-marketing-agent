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

  private formatScheduledTime(date: Date): string {
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

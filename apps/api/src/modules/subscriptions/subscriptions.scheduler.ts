import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class SubscriptionsScheduler {
  private readonly logger = new Logger(SubscriptionsScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendRenewalReminders() {
    const candidates = await this.prisma.serviceSubscription.findMany({
      where: {
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL],
        },
        OR: [{ renewalDate: { not: null } }, { planEndDate: { not: null } }],
      },
      orderBy: { renewalDate: 'asc' },
    });

    const now = new Date();

    for (const item of candidates) {
      const targetDate = item.renewalDate || item.planEndDate;
      if (!targetDate) continue;

      const msLeft = targetDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));

      if (daysLeft < 0 || daysLeft > item.reminderDays) {
        continue;
      }

      if (item.lastReminderSentAt) {
        const msFromLastReminder =
          now.getTime() - item.lastReminderSentAt.getTime();
        if (msFromLastReminder < 24 * 60 * 60 * 1000) {
          continue;
        }
      }

      const to =
        item.alertEmail ||
        process.env.SUBSCRIPTION_ALERT_EMAIL ||
        process.env.SMTP_FROM ||
        process.env.SMTP_USER;

      if (!to) {
        this.logger.warn(
          `No alert recipient configured for subscription ${item.id}; skipping reminder`,
        );
        continue;
      }

      const subject = `[Curex24] Subscription renewal in ${daysLeft} day(s): ${item.name}`;
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:20px;background:#f8fafc;border-radius:10px;">
          <h2 style="margin:0 0 8px 0;color:#0f172a;">Subscription Renewal Reminder</h2>
          <p style="margin:0 0 16px 0;color:#334155;">${item.name} (${item.provider}) is due soon.</p>
          <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;">
            <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0;color:#64748b;">Status</td><td style="padding:10px;border-bottom:1px solid #e2e8f0;color:#0f172a;">${item.status}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0;color:#64748b;">Renewal/End Date</td><td style="padding:10px;border-bottom:1px solid #e2e8f0;color:#0f172a;">${targetDate.toISOString().slice(0, 10)}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0;color:#64748b;">Days Left</td><td style="padding:10px;border-bottom:1px solid #e2e8f0;color:#0f172a;">${daysLeft}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0;color:#64748b;">Planned</td><td style="padding:10px;border-bottom:1px solid #e2e8f0;color:#0f172a;">${item.currency} ${item.plannedAmount.toFixed(2)}</td></tr>
            <tr><td style="padding:10px;color:#64748b;">Actual</td><td style="padding:10px;color:#0f172a;">${item.currency} ${item.actualAmount.toFixed(2)}</td></tr>
          </table>
        </div>
      `;

      try {
        await this.emailService.sendEmail({ to, subject, html });

        await this.prisma.serviceSubscription.update({
          where: { id: item.id },
          data: { lastReminderSentAt: now },
        });

        this.logger.log(`Sent reminder for subscription ${item.id} to ${to}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to send reminder for subscription ${item.id}: ${message}`,
        );
      }
    }
  }
}

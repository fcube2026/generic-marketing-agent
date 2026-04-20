import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  PHARMACY_ORDER_STATUS_QUEUE,
  PHARMACY_REFILL_REMINDER_QUEUE,
  PHARMACY_JOB_NAMES,
  PHARMACY_JOB_DEFAULTS,
} from './pharmacy-queue.constants';
import { RefillReminderData } from './pharmacy-job.service';

/**
 * Manages repeatable job scheduling for pharmacy background processing.
 *
 * On module init, sets up the recurring order-status polling job.
 * Exposes methods to schedule one-off refill reminders.
 */
@Injectable()
export class PharmacyJobScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PharmacyJobScheduler.name);

  constructor(
    @InjectQueue(PHARMACY_ORDER_STATUS_QUEUE)
    private readonly orderStatusQueue: Queue,
    @InjectQueue(PHARMACY_REFILL_REMINDER_QUEUE)
    private readonly refillReminderQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.setupOrderStatusPolling();
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down pharmacy job scheduler');
  }

  // ---------------------------------------------------------------------------
  // Order Status Polling (repeatable job)
  // ---------------------------------------------------------------------------

  private async setupOrderStatusPolling(): Promise<void> {
    const intervalMs =
      this.configService.get<number>('PHARMACY_STATUS_POLL_INTERVAL_MS') ??
      PHARMACY_JOB_DEFAULTS.STATUS_POLL_INTERVAL_MS;

    // Remove existing repeatable jobs to avoid duplicates on restart
    const existingRepeatables = await this.orderStatusQueue.getRepeatableJobs();
    for (const job of existingRepeatables) {
      await this.orderStatusQueue.removeRepeatableByKey(job.key);
    }

    await this.orderStatusQueue.add(
      PHARMACY_JOB_NAMES.POLL_ORDER_STATUSES,
      {},
      {
        repeat: { every: intervalMs },
        jobId: 'pharmacy-order-status-poll',
      },
    );

    this.logger.log(
      `Order status polling scheduled every ${intervalMs}ms (${(intervalMs / 1000 / 60).toFixed(1)} min)`,
    );
  }

  // ---------------------------------------------------------------------------
  // Refill Reminders (delayed one-off jobs)
  // ---------------------------------------------------------------------------

  /**
   * Schedule a refill reminder for a delivered order.
   *
   * @param orderId            The pharmacy order ID
   * @param orderNumber        Human-readable order number
   * @param patientProfileId   The patient who placed the order
   * @param deliveredAt        When the order was delivered
   * @param prescriptionDays   Duration of the prescription in days (default: 30)
   */
  async scheduleRefillReminder(
    orderId: string,
    orderNumber: string,
    patientProfileId: string,
    deliveredAt: Date,
    prescriptionDays: number = PHARMACY_JOB_DEFAULTS.DEFAULT_PRESCRIPTION_DURATION_DAYS,
  ): Promise<void> {
    const reminderDaysBefore =
      this.configService.get<number>('PHARMACY_REFILL_REMINDER_DAYS_BEFORE') ??
      PHARMACY_JOB_DEFAULTS.REFILL_REMINDER_DAYS_BEFORE;

    const refillDate = new Date(deliveredAt);
    refillDate.setDate(refillDate.getDate() + prescriptionDays);

    const reminderDate = new Date(refillDate);
    reminderDate.setDate(reminderDate.getDate() - reminderDaysBefore);

    const followupDate = new Date(refillDate);
    followupDate.setDate(followupDate.getDate() - 1);

    const now = new Date();

    const jobData: RefillReminderData = {
      orderId,
      patientProfileId,
      orderNumber,
      deliveredAt,
      refillDate,
      reminderDate,
      isFollowup: false,
    };

    // Schedule initial reminder
    const initialDelay = Math.max(0, reminderDate.getTime() - now.getTime());
    await this.refillReminderQueue.add(
      PHARMACY_JOB_NAMES.REFILL_REMINDER,
      jobData,
      {
        delay: initialDelay,
        jobId: `refill-reminder-${orderId}`,
      },
    );

    // Schedule follow-up reminder (1 day before refill date)
    const followupDelay = Math.max(0, followupDate.getTime() - now.getTime());
    if (followupDelay > initialDelay) {
      await this.refillReminderQueue.add(
        PHARMACY_JOB_NAMES.REFILL_REMINDER_FOLLOWUP,
        { ...jobData, reminderDate: followupDate, isFollowup: true },
        {
          delay: followupDelay,
          jobId: `refill-followup-${orderId}`,
        },
      );
    }

    this.logger.log(
      `Refill reminders scheduled for order "${orderNumber}": ` +
        `initial in ${Math.round(initialDelay / 1000 / 60 / 60)}h, ` +
        `followup in ${Math.round(followupDelay / 1000 / 60 / 60)}h`,
    );
  }
}

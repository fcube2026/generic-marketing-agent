import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PharmacyJobService, RefillReminderData } from './pharmacy-job.service';
import {
  PHARMACY_REFILL_REMINDER_QUEUE,
  PHARMACY_JOB_NAMES,
} from './pharmacy-queue.constants';

/**
 * BullMQ processor for pharmacy refill reminder notifications.
 *
 * When an order reaches DELIVERED status, a delayed job is scheduled for
 * X days before the calculated refill date. This processor sends the
 * notification and optionally schedules a follow-up reminder.
 */
@Processor(PHARMACY_REFILL_REMINDER_QUEUE)
export class RefillReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(RefillReminderProcessor.name);

  constructor(private readonly pharmacyJobService: PharmacyJobService) {
    super();
  }

  async process(job: Job<RefillReminderData>): Promise<void> {
    const validNames = [
      PHARMACY_JOB_NAMES.REFILL_REMINDER,
      PHARMACY_JOB_NAMES.REFILL_REMINDER_FOLLOWUP,
    ];

    if (!validNames.includes(job.name as any)) {
      this.logger.warn(`[processor] Unknown job name: ${job.name}`);
      return;
    }

    const data = job.data;
    const isFollowup = job.name === PHARMACY_JOB_NAMES.REFILL_REMINDER_FOLLOWUP;

    this.logger.log(
      `[processor] Processing ${isFollowup ? 'follow-up' : 'initial'} refill reminder ` +
        `for order "${data.orderNumber}" (attempt ${job.attemptsMade + 1})`,
    );

    // Idempotency: check if reminder was already sent
    const alreadySent = await this.pharmacyJobService.hasReminderBeenSent(
      data.orderId,
      isFollowup,
    );
    if (alreadySent) {
      this.logger.log(
        `[processor] Reminder already sent for order "${data.orderId}" — skipping`,
      );
      return;
    }

    // Reconstruct date objects (serialized as strings in job data)
    const reminderData: RefillReminderData = {
      ...data,
      deliveredAt: new Date(data.deliveredAt),
      refillDate: new Date(data.refillDate),
      reminderDate: new Date(data.reminderDate),
      isFollowup,
    };

    await this.pharmacyJobService.sendNotification(reminderData);
    await this.pharmacyJobService.recordReminderSent(data.orderId, isFollowup);

    this.logger.log(
      `[processor] Refill reminder sent for order "${data.orderNumber}"`,
    );
  }
}

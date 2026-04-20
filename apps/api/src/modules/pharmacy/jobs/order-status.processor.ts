import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PharmacyJobService } from './pharmacy-job.service';
import {
  PHARMACY_ORDER_STATUS_QUEUE,
  PHARMACY_JOB_NAMES,
} from './pharmacy-queue.constants';

/**
 * BullMQ processor that polls all active pharmacy orders for status updates.
 *
 * This acts as a fallback mechanism when webhook delivery fails — it
 * periodically queries the mock provider and reconciles order statuses.
 */
@Processor(PHARMACY_ORDER_STATUS_QUEUE)
export class OrderStatusProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderStatusProcessor.name);

  constructor(private readonly pharmacyJobService: PharmacyJobService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== PHARMACY_JOB_NAMES.POLL_ORDER_STATUSES) {
      this.logger.warn(`[processor] Unknown job name: ${job.name}`);
      return;
    }

    this.logger.log(
      `[processor] Starting order status poll (attempt ${job.attemptsMade + 1})`,
    );

    const result = await this.pharmacyJobService.pollOrderStatuses();

    this.logger.log(
      `[processor] Poll complete — total=${result.totalOrders} updated=${result.updated} ` +
        `skipped=${result.skipped} errors=${result.errors}`,
    );

    // If all orders errored, throw to trigger retry
    if (result.errors > 0 && result.updated === 0 && result.skipped === 0) {
      throw new Error(
        `All ${result.errors} order(s) failed to poll — triggering retry`,
      );
    }
  }
}

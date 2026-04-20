import { Module, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PharmacyPartnerProvider } from '../providers/pharmacy-partner.interface';
import { PHARMACY_PROVIDERS_MAP } from '../pharmacy.module';
import { PharmacyJobService } from './pharmacy-job.service';
import { OrderStatusProcessor } from './order-status.processor';
import { RefillReminderProcessor } from './refill-reminder.processor';
import { PharmacyJobScheduler } from './pharmacy-job.scheduler';
import {
  PHARMACY_ORDER_STATUS_QUEUE,
  PHARMACY_REFILL_REMINDER_QUEUE,
} from './pharmacy-queue.constants';
import { QUEUES_ENABLED } from '../../../common/queue/queue.module';

const logger = new Logger('PharmacyJobModule');

/**
 * Module that registers pharmacy-specific BullMQ queues, processors, and the scheduler.
 *
 * When Redis is not configured (QUEUES_ENABLED = false), the queues are
 * stubbed with null providers so the application still boots.
 */
@Module({
  imports: QUEUES_ENABLED
    ? [
        BullModule.registerQueue(
          {
            name: PHARMACY_ORDER_STATUS_QUEUE,
            defaultJobOptions: {
              attempts: 3,
              backoff: { type: 'exponential', delay: 5_000 },
              removeOnComplete: true,
              removeOnFail: false, // keep failed jobs for debugging
            },
          },
          {
            name: PHARMACY_REFILL_REMINDER_QUEUE,
            defaultJobOptions: {
              attempts: 3,
              backoff: { type: 'exponential', delay: 5_000 },
              removeOnComplete: true,
              removeOnFail: false,
            },
          },
        ),
      ]
    : [],
  providers: [
    {
      provide: PharmacyJobService,
      useFactory: (
        prisma: PrismaService,
        providers: Map<string, PharmacyPartnerProvider>,
      ): PharmacyJobService => new PharmacyJobService(prisma, providers),
      inject: [PrismaService, PHARMACY_PROVIDERS_MAP],
    },
    ...(QUEUES_ENABLED
      ? [OrderStatusProcessor, RefillReminderProcessor, PharmacyJobScheduler]
      : (() => {
          logger.warn(
            'Redis not configured — pharmacy job processors disabled.',
          );
          return [];
        })()),
  ],
  exports: [PharmacyJobService],
})
export class PharmacyJobModule {}

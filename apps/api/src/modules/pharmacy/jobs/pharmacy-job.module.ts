import { Module, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PharmacyPartnerProvider } from '../providers/pharmacy-partner.interface';
import { PHARMACY_PROVIDERS_MAP } from '../pharmacy.constants';
import { PharmacyJobService, IRefillScheduler } from './pharmacy-job.service';
import { OrderStatusProcessor } from './order-status.processor';
import { RefillReminderProcessor } from './refill-reminder.processor';
import { PharmacyJobScheduler } from './pharmacy-job.scheduler';
import {
  PHARMACY_ORDER_STATUS_QUEUE,
  PHARMACY_REFILL_REMINDER_QUEUE,
} from './pharmacy-queue.constants';
import { QUEUES_ENABLED } from '../../../common/queue/queue.module';
import { MockPharmacyProvider } from '../providers/mock-pharmacy.provider';

const logger = new Logger('PharmacyJobModule');

/**
 * Module that registers pharmacy-specific BullMQ queues, processors, and the scheduler.
 *
 * When Redis is not configured (QUEUES_ENABLED = false), the queues are
 * stubbed with null providers so the application still boots.
 *
 * This module provides its own PHARMACY_PROVIDERS_MAP so it can be
 * self-contained and avoid circular dependencies with PharmacyModule.
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
    MockPharmacyProvider,
    {
      provide: PHARMACY_PROVIDERS_MAP,
      useFactory: (
        mockProvider: MockPharmacyProvider,
      ): Map<string, PharmacyPartnerProvider> => {
        const map = new Map<string, PharmacyPartnerProvider>();
        map.set('mock', mockProvider);
        // Register the seeded demo partners so per-partner polling can resolve
        // them without falling all the way back to the hardcoded 'mock' key.
        map.set('demo-pharmacy', mockProvider);
        map.set('demo-pharmacy-express', mockProvider);
        return map;
      },
      inject: [MockPharmacyProvider],
    },
    {
      provide: PharmacyJobService,
      useFactory: (
        prisma: PrismaService,
        providers: Map<string, PharmacyPartnerProvider>,
        scheduler: IRefillScheduler | null,
      ): PharmacyJobService =>
        new PharmacyJobService(prisma, providers, scheduler),
      inject: [
        PrismaService,
        PHARMACY_PROVIDERS_MAP,
        { token: PharmacyJobScheduler, optional: true },
      ],
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
  exports: QUEUES_ENABLED
    ? [PharmacyJobService, PharmacyJobScheduler]
    : [PharmacyJobService],
})
export class PharmacyJobModule {}

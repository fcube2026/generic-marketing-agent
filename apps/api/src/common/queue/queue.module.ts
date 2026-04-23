import 'dotenv/config';
import { Module, Global, Logger } from '@nestjs/common';
import { BullModule, getQueueToken } from '@nestjs/bullmq';

export const NOTIFICATION_QUEUE = 'notifications';
export const FALLBACK_QUEUE = 'notification-fallback';
export const REMINDER_QUEUE = 'appointment-reminders';
export const QUEUES_ENABLED = Boolean(process.env.REDIS_URL);

const logger = new Logger('QueueModule');

if (!QUEUES_ENABLED) {
  logger.warn(
    'REDIS_URL not configured. Queue workers are disabled and notifications will run synchronously.',
  );
}

const disabledQueueTokens = [
  getQueueToken(NOTIFICATION_QUEUE),
  getQueueToken(FALLBACK_QUEUE),
  getQueueToken(REMINDER_QUEUE),
];

const queueImports = QUEUES_ENABLED
  ? [
      BullModule.forRoot({
        connection: (() => {
          const redisUrl = process.env.REDIS_URL!;
          const url = new URL(redisUrl);

          logger.log('Redis connection configured for queue processing');

          return {
            host: url.hostname,
            port: parseInt(url.port, 10) || 6379,
            password: url.password || undefined,
            username: url.username || undefined,
            tls: url.protocol === 'rediss:' ? {} : undefined,
            maxRetriesPerRequest: null,
          };
        })(),
      }),
      BullModule.registerQueue(
        { name: NOTIFICATION_QUEUE },
        { name: FALLBACK_QUEUE },
        { name: REMINDER_QUEUE },
      ),
    ]
  : [];

const disabledQueueProviders = QUEUES_ENABLED
  ? []
  : disabledQueueTokens.map((token) => ({ provide: token, useValue: null }));

@Global()
@Module({
  imports: queueImports,
  providers: disabledQueueProviders,
  exports: QUEUES_ENABLED ? [BullModule] : disabledQueueTokens,
})
export class QueueModule {}

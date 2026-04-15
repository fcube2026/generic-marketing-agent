import { Module, Global, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const NOTIFICATION_QUEUE = 'notifications';
export const FALLBACK_QUEUE = 'notification-fallback';
export const REMINDER_QUEUE = 'appointment-reminders';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const logger = new Logger('QueueModule');

        if (!redisUrl) {
          logger.warn(
            'REDIS_URL not configured. Queue features will be disabled. Set REDIS_URL to enable notification queuing.',
          );
          // Return a minimal config that will fail gracefully
          return {
            connection: {
              host: 'localhost',
              port: 6379,
              maxRetriesPerRequest: 0,
              retryStrategy: () => null, // Don't retry
            },
          };
        }

        logger.log('Redis connection configured for queue processing');

        // Parse Redis URL
        const url = new URL(redisUrl);
        return {
          connection: {
            host: url.hostname,
            port: parseInt(url.port) || 6379,
            password: url.password || undefined,
            username: url.username || undefined,
            tls: url.protocol === 'rediss:' ? {} : undefined,
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: NOTIFICATION_QUEUE },
      { name: FALLBACK_QUEUE },
      { name: REMINDER_QUEUE },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/** Maximum number of connection attempts before giving up. */
const MAX_RETRIES = 5;

/** Initial delay between retries in milliseconds (doubles each attempt). */
const INITIAL_RETRY_DELAY_MS = 2_000;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Attempt to connect to the database with exponential backoff.
   *
   * Railway may start the container before the database is fully
   * reachable (especially after a cold start or region failover).
   * Without retries the NestJS app crashes immediately, the
   * container restarts, and the healthcheck window is consumed
   * by repeated crash loops.
   */
  private async connectWithRetry(): Promise<void> {
    let delay = INITIAL_RETRY_DELAY_MS;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Database connected successfully');
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (attempt === MAX_RETRIES) {
          this.logger.error(
            `Database connection failed after ${MAX_RETRIES} attempts: ${message}`,
          );
          throw err;
        }
        this.logger.warn(
          `Database connection attempt ${attempt}/${MAX_RETRIES} failed: ${message} — retrying in ${delay}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  }
}

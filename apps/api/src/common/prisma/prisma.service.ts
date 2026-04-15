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
    // Fire-and-forget: let the app start even if the database is temporarily
    // unreachable so the Railway healthcheck can pass.  Prisma will lazily
    // reconnect on the first real query.
    this.connectWithRetry().catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Initial database connection failed — the app will still start. Error: ${msg}`,
      );
    });
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
        await this.ensureUserColumns();
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

  /**
   * Ensure the User table has the email/passwordHash/isActive columns.
   * If prisma migrate deploy failed (e.g. DIRECT_URL missing or pooler
   * blocking DDL), the generated Prisma client expects these columns but
   * they don't exist, crashing ALL User queries. This applies them via
   * the app's own connection as a safety net.
   */
  private async ensureUserColumns(): Promise<void> {
    try {
      await this.$executeRawUnsafe(`
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" TEXT;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
      `);
      // Index creation is separate (can't be inside a multi-statement batch easily)
      await this.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "users"("email");
      `);
      this.logger.log('User columns verified/applied');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`ensureUserColumns failed (non-fatal): ${msg}`);
    }
  }
}

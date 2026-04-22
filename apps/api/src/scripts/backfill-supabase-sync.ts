import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../common/prisma/prisma.module';
import { SupabaseSyncModule } from '../common/supabase/supabase-sync.module';
import { SupabaseSyncService } from '../common/supabase/supabase-sync.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, SupabaseSyncModule],
})
class BackfillSupabaseSyncCliModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(
    BackfillSupabaseSyncCliModule,
    { logger: ['log', 'warn', 'error'] },
  );

  try {
    const syncService = app.get(SupabaseSyncService);
    if (!syncService.isEnabled()) {
      throw new Error(
        'Supabase sync is disabled. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.',
      );
    }

    const counts = await syncService.backfillCoreData();
    console.log(`Supabase backfill complete: ${JSON.stringify(counts)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Supabase backfill failed: ${message}`);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();
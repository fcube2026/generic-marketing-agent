import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SupabaseSyncService } from '../common/supabase/supabase-sync.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const syncService = app.get(SupabaseSyncService);

  console.log('Starting full data sync to Supabase...');
  
  if (!syncService.isEnabled()) {
    console.error('Supabase sync is disabled. Check your env vars.');
    await app.close();
    process.exit(1);
  }

  try {
    const results = await syncService.backfillCoreData();
    console.log('Sync completed successfully:', results);
  } catch (err) {
    console.error('Sync failed:', err);
  } finally {
    await app.close();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

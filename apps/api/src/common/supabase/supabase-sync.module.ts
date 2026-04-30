import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseSyncService } from './supabase-sync.service';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [SupabaseSyncService],
  exports: [SupabaseSyncService],
})
export class SupabaseSyncModule {}

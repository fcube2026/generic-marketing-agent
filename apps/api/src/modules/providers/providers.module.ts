import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { SupabaseSyncModule } from '../../common/supabase/supabase-sync.module';

@Module({
  imports: [SupabaseSyncModule],
  providers: [ProvidersService],
  controllers: [ProvidersController],
  exports: [ProvidersService],
})
export class ProvidersModule {}

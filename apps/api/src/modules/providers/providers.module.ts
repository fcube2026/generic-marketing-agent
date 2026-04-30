import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { SupabaseSyncModule } from '../../common/supabase/supabase-sync.module';
import { PrescriptionModule } from '../prescription/prescription.module';

@Module({
  imports: [SupabaseSyncModule, PrescriptionModule],
  providers: [ProvidersService],
  controllers: [ProvidersController],
  exports: [ProvidersService],
})
export class ProvidersModule {}

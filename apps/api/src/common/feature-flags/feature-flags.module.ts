import { Module, Global } from '@nestjs/common';
import { FeatureFlagService } from './feature-flags.service';

@Global()
@Module({
  providers: [FeatureFlagService],
  exports: [FeatureFlagService],
})
export class FeatureFlagsModule {}

import { Module } from '@nestjs/common';
import { PharmacyPartnersController } from './pharmacy-partners.controller';
import { PharmacyPartnersService } from './pharmacy-partners.service';

@Module({
  controllers: [PharmacyPartnersController],
  providers: [PharmacyPartnersService],
  exports: [PharmacyPartnersService],
})
export class PharmacyPartnersModule {}

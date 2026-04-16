import { Module } from '@nestjs/common';
import { PharmacyController } from './pharmacy.controller';
import { PharmacyService } from './pharmacy.service';
import { PharmacyOrderService } from './pharmacy-order.service';
import { MockPharmacyProvider } from './providers/mock-pharmacy.provider';
import { PharmEasyProvider } from './providers/pharmeasy.provider';
import { PharmacyPartnerProvider } from './providers/pharmacy-partner.interface';
import { PrismaService } from '../../common/prisma/prisma.service';

export const PHARMACY_PROVIDERS_MAP = 'PHARMACY_PROVIDERS_MAP';

@Module({
  controllers: [PharmacyController],
  providers: [
    MockPharmacyProvider,
    PharmEasyProvider,
    {
      provide: PHARMACY_PROVIDERS_MAP,
      useFactory: (
        mockProvider: MockPharmacyProvider,
        pharmEasyProvider: PharmEasyProvider,
      ): Map<string, PharmacyPartnerProvider> => {
        const map = new Map<string, PharmacyPartnerProvider>();
        map.set('mock', mockProvider);
        map.set('pharmeasy', pharmEasyProvider);
        return map;
      },
      inject: [MockPharmacyProvider, PharmEasyProvider],
    },
    {
      provide: PharmacyService,
      useFactory: (
        providers: Map<string, PharmacyPartnerProvider>,
      ): PharmacyService => new PharmacyService(providers),
      inject: [PHARMACY_PROVIDERS_MAP],
    },
    {
      provide: PharmacyOrderService,
      useFactory: (
        prisma: PrismaService,
        providers: Map<string, PharmacyPartnerProvider>,
      ): PharmacyOrderService => new PharmacyOrderService(prisma, providers),
      inject: [PrismaService, PHARMACY_PROVIDERS_MAP],
    },
  ],
  exports: [PharmacyService, PharmacyOrderService],
})
export class PharmacyModule {}

import { Module } from '@nestjs/common';
import { PharmacyController } from './pharmacy.controller';
import { PharmacyService } from './pharmacy.service';
import { PharmacyOrderService } from './pharmacy-order.service';
import { MockPharmacyProvider } from './providers/mock-pharmacy.provider';
import { PharmacyPartnerProvider } from './providers/pharmacy-partner.interface';
import { PharmacyWebhookService } from './webhooks/pharmacy-webhook.service';
import { PrismaService } from '../../common/prisma/prisma.service';

export const PHARMACY_PROVIDERS_MAP = 'PHARMACY_PROVIDERS_MAP';

@Module({
  controllers: [PharmacyController],
  providers: [
    MockPharmacyProvider,
    PharmacyWebhookService,
    {
      provide: PHARMACY_PROVIDERS_MAP,
      useFactory: (
        mockProvider: MockPharmacyProvider,
      ): Map<string, PharmacyPartnerProvider> => {
        const map = new Map<string, PharmacyPartnerProvider>();
        map.set('mock', mockProvider);
        map.set('demo-pharmacy', mockProvider);
        map.set('demo-pharmacy-express', mockProvider);
        return map;
      },
      inject: [MockPharmacyProvider],
    },
    {
      provide: PharmacyService,
      useFactory: (
        prisma: PrismaService,
        providers: Map<string, PharmacyPartnerProvider>,
      ): PharmacyService => new PharmacyService(prisma, providers),
      inject: [PrismaService, PHARMACY_PROVIDERS_MAP],
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
  exports: [PharmacyService, PharmacyOrderService, PharmacyWebhookService],
})
export class PharmacyModule {}

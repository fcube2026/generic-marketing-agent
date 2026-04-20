import { Module } from '@nestjs/common';
import { PharmacyController } from './pharmacy.controller';
import { PharmacyService } from './pharmacy.service';
import { PharmacyOrderService } from './pharmacy-order.service';
import { MockPharmacyProvider } from './providers/mock-pharmacy.provider';
import { PharmacyPartnerProvider } from './providers/pharmacy-partner.interface';
import { PharmacyWebhookService } from './webhooks/pharmacy-webhook.service';
import { PharmacyOrderWebhookService } from './webhooks/pharmacy-order-webhook.service';
import { MockWebhookSimulatorService } from './webhooks/mock-webhook-simulator.service';
import { PharmacyWebhookController } from './webhooks/pharmacy-webhook.controller';
import { WebhookRateLimitGuard } from './webhooks/guards/webhook-rate-limit.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PrescriptionModule } from '../prescription/prescription.module';
import { PrescriptionService } from '../prescription/prescription.service';

export const PHARMACY_PROVIDERS_MAP = 'PHARMACY_PROVIDERS_MAP';

@Module({
  imports: [PrescriptionModule],
  controllers: [PharmacyController, PharmacyWebhookController],
  providers: [
    MockPharmacyProvider,
    PharmacyWebhookService,
    PharmacyOrderWebhookService,
    MockWebhookSimulatorService,
    WebhookRateLimitGuard,
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
        prescriptionService: PrescriptionService,
      ): PharmacyOrderService =>
        new PharmacyOrderService(prisma, providers, prescriptionService),
      inject: [PrismaService, PHARMACY_PROVIDERS_MAP, PrescriptionService],
    },
  ],
  exports: [
    PharmacyService,
    PharmacyOrderService,
    PharmacyWebhookService,
    PharmacyOrderWebhookService,
    MockWebhookSimulatorService,
  ],
})
export class PharmacyModule {}

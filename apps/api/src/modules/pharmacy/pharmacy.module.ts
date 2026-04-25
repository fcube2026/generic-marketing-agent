import { Module } from '@nestjs/common';
import { PharmacyController } from './pharmacy.controller';
import { PharmacyService } from './pharmacy.service';
import { PharmacyOrderService } from './pharmacy-order.service';
import { MockPharmacyProvider } from './providers/mock-pharmacy.provider';
import { LocalPharmacyProvider } from './providers/local-pharmacy.provider';
import { PharmacyPartnerProvider } from './providers/pharmacy-partner.interface';
import { PharmacyWebhookService } from './webhooks/pharmacy-webhook.service';
import { PharmacyOrderWebhookService } from './webhooks/pharmacy-order-webhook.service';
import { MockWebhookSimulatorService } from './webhooks/mock-webhook-simulator.service';
import { PharmacyWebhookController } from './webhooks/pharmacy-webhook.controller';
import { WebhookRateLimitGuard } from './webhooks/guards/webhook-rate-limit.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PrescriptionModule } from '../prescription/prescription.module';
import { PrescriptionService } from '../prescription/prescription.service';
import { PrescriptionStorageService } from '../prescription/prescription-storage.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PharmacyJobModule } from './jobs/pharmacy-job.module';
import { PHARMACY_PROVIDERS_MAP } from './pharmacy.constants';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminPharmacyOrderController } from './admin-pharmacy-order.controller';
import { OrdersAliasController } from './orders-alias.controller';
import { PharmacyPartnersModule } from '../pharmacy-partners/pharmacy-partners.module';

// Re-export so existing consumers of `import { PHARMACY_PROVIDERS_MAP } from './pharmacy.module'`
// continue to work.
export { PHARMACY_PROVIDERS_MAP } from './pharmacy.constants';

@Module({
  imports: [
    PrescriptionModule,
    NotificationsModule,
    PharmacyJobModule,
    PharmacyPartnersModule,
  ],
  controllers: [
    PharmacyController,
    PharmacyWebhookController,
    AdminPharmacyOrderController,
    OrdersAliasController,
  ],
  providers: [
    MockPharmacyProvider,
    LocalPharmacyProvider,
    PharmacyWebhookService,
    PharmacyOrderWebhookService,
    MockWebhookSimulatorService,
    WebhookRateLimitGuard,
    {
      provide: PHARMACY_PROVIDERS_MAP,
      useFactory: (
        mockProvider: MockPharmacyProvider,
        localProvider: LocalPharmacyProvider,
      ): Map<string, PharmacyPartnerProvider> => {
        const map = new Map<string, PharmacyPartnerProvider>();
        map.set('mock', mockProvider);
        map.set('demo-pharmacy', mockProvider);
        map.set('demo-pharmacy-express', mockProvider);
        // LocalPharmacyProvider registered alongside mock — coexists without replacing it
        map.set('local', localProvider);
        return map;
      },
      inject: [MockPharmacyProvider, LocalPharmacyProvider],
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
        prescriptionStorage: PrescriptionStorageService,
        notificationsService: NotificationsService,
      ): PharmacyOrderService =>
        new PharmacyOrderService(
          prisma,
          providers,
          prescriptionService,
          prescriptionStorage,
          notificationsService,
        ),
      inject: [
        PrismaService,
        PHARMACY_PROVIDERS_MAP,
        PrescriptionService,
        PrescriptionStorageService,
        NotificationsService,
      ],
    },
  ],
  exports: [
    PharmacyService,
    PharmacyOrderService,
    PharmacyWebhookService,
    PharmacyOrderWebhookService,
    MockWebhookSimulatorService,
    PharmacyJobModule,
  ],
})
export class PharmacyModule {}

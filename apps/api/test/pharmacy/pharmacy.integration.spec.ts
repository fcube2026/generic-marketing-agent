/**
 * Pharmacy module integration tests.
 *
 * Boots the real NestJS application (via `createTestApp`) and exercises the
 * full pharmacy order lifecycle through the real `PharmacyOrderService`,
 * `PharmacyService` and `PrescriptionService`. The pharmacy partner provider
 * is the in-memory `MockPharmacyProvider` already wired in
 * `PharmacyModule` — no real external API is touched.
 *
 * Requirements to run locally:
 *   - PostgreSQL accessible via `DATABASE_URL`
 *   - Redis accessible via `REDIS_URL` (BullMQ)
 *
 * These tests are picked up by `jest.integration.config.js` only
 * (file extension `.integration.spec.ts`) and are excluded from the
 * default unit test run. CI does not invoke `test:integration`.
 */
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { PharmacyOrderService } from '../../src/modules/pharmacy/pharmacy-order.service';
import { PharmacyService } from '../../src/modules/pharmacy/pharmacy.service';
import { CreatePharmacyOrderDto } from '../../src/modules/pharmacy/dto/create-pharmacy-order.dto';
import { createTestApp, cleanDatabase } from '../integration-setup';

const PARTNER_CODE = 'mock';

describe('Pharmacy Module (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let orderService: PharmacyOrderService;
  let pharmacyService: PharmacyService;

  // The MockPharmacyProvider has a 10% random failure rate driven by
  // Math.random < 0.1. We pin Math.random to a value above the threshold
  // so the lifecycle/prescription tests are deterministic.
  let randomSpy: jest.SpyInstance;

  let userId: string;
  let patientProfileId: string;
  let partnerId: string;
  let addressId: string;

  const baseItem = {
    medicineCode: 'mock-med-005', // Cetirizine 10mg, OTC, price 22
    medicineName: 'Cetirizine 10mg',
    quantity: 10, // subtotal 220 -> tier 40 delivery (Rs 120-249)
    unitPrice: 22,
  };

  const buildDto = (
    overrides: Partial<CreatePharmacyOrderDto> = {},
  ): CreatePharmacyOrderDto =>
    ({
      partnerId,
      deliveryAddressId: addressId,
      items: [baseItem],
      ...overrides,
    }) as CreatePharmacyOrderDto;

  beforeAll(async () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    app = await createTestApp();
    prisma = app.get(PrismaService);
    orderService = app.get(PharmacyOrderService);
    pharmacyService = app.get(PharmacyService);
  });

  afterAll(async () => {
    randomSpy.mockRestore();
    await prisma.pharmacyOrderItem.deleteMany().catch(() => undefined);
    await prisma.pharmacyOrder.deleteMany().catch(() => undefined);
    await prisma.uploadedPrescription.deleteMany().catch(() => undefined);
    await prisma.pharmacyPartner.deleteMany().catch(() => undefined);
    await cleanDatabase(prisma);
    await app.close();
  });

  beforeEach(async () => {
    // Order matters because of FK constraints.
    await prisma.pharmacyOrderItem.deleteMany().catch(() => undefined);
    await prisma.pharmacyOrder.deleteMany().catch(() => undefined);
    await prisma.uploadedPrescription.deleteMany().catch(() => undefined);
    await prisma.pharmacyPartner.deleteMany().catch(() => undefined);
    await cleanDatabase(prisma);

    const partner = await prisma.pharmacyPartner.create({
      data: {
        name: 'Mock Pharmacy (Integration)',
        code: PARTNER_CODE,
        displayName: 'Mock Pharmacy',
        apiBaseUrl: 'https://example.invalid/mock',
        isActive: true,
      },
    });
    partnerId = partner.id;

    const user = await prisma.user.create({
      data: {
        phone: '+919999990001',
        role: 'PATIENT',
        patientProfile: {
          create: { name: 'Pharmacy Integration Patient' },
        },
        addresses: {
          create: {
            label: 'Home',
            addressLine: '123 Test Street',
            city: 'Bengaluru',
            state: 'KA',
            pincode: '560001',
          },
        },
      },
      include: { patientProfile: true, addresses: true },
    });
    userId = user.id;
    patientProfileId = user.patientProfile!.id;
    addressId = user.addresses[0].id;
  });

  // -------------------------------------------------------------------------
  // 1. Full order lifecycle
  // -------------------------------------------------------------------------
  describe('Full order lifecycle', () => {
    it('places an order, then progresses through CONFIRMED → PACKED → SHIPPED → DELIVERED via the mock provider', async () => {
      const placed = await orderService.placeOrder(userId, buildDto());

      expect(placed.id).toBeDefined();
      expect(placed.status).toBe('PENDING'); // service maps PLACED -> PENDING by default
      expect(placed.partnerCode).toBe(PARTNER_CODE);
      expect(placed.partnerOrderId).toBeDefined();
      expect(placed.subtotal).toBe(220);
      expect(placed.totalAmount).toBe(220 + placed.deliveryFee);

      // Mock provider auto-advances exactly one step per getOrderStatus call.
      // We refresh repeatedly and capture the visible transitions.
      const visited: string[] = [placed.status];
      let current = placed;
      for (let i = 0; i < 8 && current.status !== 'DELIVERED'; i += 1) {
        const next = await orderService.refreshOrderStatus(current.id, userId);
        if (next.status !== current.status) {
          visited.push(next.status);
        }
        current = next;
      }

      // The terminal observable status is DELIVERED.
      expect(current.status).toBe('DELIVERED');
      // The progression should never go backwards.
      const order = [
        'PENDING',
        'CONFIRMED',
        'PACKED',
        'SHIPPED',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
      ];
      const indices = visited.map((s) => order.indexOf(s));
      for (let i = 1; i < indices.length; i += 1) {
        expect(indices[i]).toBeGreaterThanOrEqual(indices[i - 1]);
      }
    });

    it('rejects cancellation once an order has reached a non-cancellable status', async () => {
      const placed = await orderService.placeOrder(userId, buildDto());

      // Drive the order to DELIVERED via repeated refreshes.
      let current = placed;
      for (let i = 0; i < 8 && current.status !== 'DELIVERED'; i += 1) {
        current = await orderService.refreshOrderStatus(current.id, userId);
      }
      expect(current.status).toBe('DELIVERED');

      await expect(
        orderService.cancelOrder(current.id, userId),
      ).rejects.toThrow(/no longer be cancelled/i);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Prescription flow
  // -------------------------------------------------------------------------
  describe('Prescription flow', () => {
    it('rejects an order whose uploaded prescription is still pending review', async () => {
      const rx = await prisma.uploadedPrescription.create({
        data: {
          userId,
          filePath: '/tmp/rx-pending.jpg',
          status: 'PENDING_REVIEW',
        },
      });

      await expect(
        orderService.placeOrder(
          userId,
          buildDto({ uploadedPrescriptionId: rx.id }),
        ),
      ).rejects.toThrow(/APPROVED/i);
    });

    it('allows an order once the prescription has been approved', async () => {
      const rx = await prisma.uploadedPrescription.create({
        data: {
          userId,
          filePath: '/tmp/rx-approved.jpg',
          status: 'APPROVED',
        },
      });

      const order = await orderService.placeOrder(
        userId,
        buildDto({ uploadedPrescriptionId: rx.id }),
      );

      expect(order.uploadedPrescriptionId).toBe(rx.id);
      expect(order.status).toBe('PENDING');
    });

    it('rejects an order that references a prescription owned by another user', async () => {
      const otherUser = await prisma.user.create({
        data: {
          phone: '+919999990002',
          role: 'PATIENT',
          patientProfile: { create: { name: 'Other Patient' } },
        },
      });
      const rx = await prisma.uploadedPrescription.create({
        data: {
          userId: otherUser.id,
          filePath: '/tmp/rx-other.jpg',
          status: 'APPROVED',
        },
      });

      await expect(
        orderService.placeOrder(
          userId,
          buildDto({ uploadedPrescriptionId: rx.id }),
        ),
      ).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // 3. Error handling
  // -------------------------------------------------------------------------
  describe('Error handling', () => {
    it('rejects orders below the minimum subtotal', async () => {
      await expect(
        orderService.placeOrder(
          userId,
          buildDto({
            items: [
              {
                ...baseItem,
                quantity: 1,
                unitPrice: 10,
              },
            ],
          }),
        ),
      ).rejects.toThrow(/Minimum order amount/i);
    });

    it('rejects orders that reference an unknown pharmacy partner', async () => {
      await expect(
        orderService.placeOrder(
          userId,
          buildDto({ partnerId: 'does-not-exist' }),
        ),
      ).rejects.toThrow(/Pharmacy partner not found/i);
    });

    it('rejects orders with no delivery address', async () => {
      await expect(
        orderService.placeOrder(
          userId,
          buildDto({ deliveryAddressId: undefined }),
        ),
      ).rejects.toThrow(/Delivery address/i);
    });

    it('does not crash when the provider transiently fails — the order is left in its previous status', async () => {
      const placed = await orderService.placeOrder(userId, buildDto());

      // Force the provider to throw on the next getOrderStatus call.
      randomSpy.mockReturnValueOnce(0.0); // < 0.1 -> PharmacyTransientError

      const refreshed = await orderService.refreshOrderStatus(
        placed.id,
        userId,
      );

      // The service swallows the transient error and returns the order
      // with its existing status — it MUST NOT crash.
      expect(refreshed.id).toBe(placed.id);
      expect(refreshed.status).toBe(placed.status);
    });

    it('exposes the active mock partner via PharmacyService.listPartners', async () => {
      const partners = await pharmacyService.listPartners();
      expect(partners.find((p) => p.code === PARTNER_CODE)).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // 4. Reads and listings
  // -------------------------------------------------------------------------
  describe('Reads and listings', () => {
    it('returns a placed order via getOrder and lists it via listPatientOrders', async () => {
      const placed = await orderService.placeOrder(userId, buildDto());

      const fetched = await orderService.getOrder(placed.id, userId);
      expect(fetched.id).toBe(placed.id);

      const list = await orderService.listPatientOrders(userId, 1, 10);
      expect(list.total).toBeGreaterThanOrEqual(1);
      expect(list.data.find((o) => o.id === placed.id)).toBeDefined();

      // Sanity: the patient profile referenced by the order matches our setup.
      expect(fetched.patientProfileId).toBe(patientProfileId);
    });
  });
});

import { MockPharmacyProvider } from './mock-pharmacy.provider';
import { PharmacyTransientError } from '../errors/pharmacy.errors';

/**
 * Unit tests for MockPharmacyProvider.
 *
 * We disable artificial latency (by mocking setTimeout/the delay helper) so
 * that tests run synchronously and finish quickly.  Failure simulation is
 * controlled by overriding Math.random.
 */
describe('MockPharmacyProvider', () => {
  let provider: MockPharmacyProvider;

  /** Always-success Math.random stub (returns 0.5 → no failure, in-stock). */
  const noFailure = () => jest.spyOn(Math, 'random').mockReturnValue(0.5);
  /** 10%-failure-rate threshold is < 0.1, so returning 0.05 triggers a failure. */
  const withFailure = () => jest.spyOn(Math, 'random').mockReturnValue(0.05);

  beforeEach(() => {
    provider = new MockPharmacyProvider();

    // Disable real timers so latency simulation resolves instantly
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // Helper: flush all pending timers and microtasks
  const flush = () => {
    jest.runAllTimers();
    return Promise.resolve();
  };

  // ---------------------------------------------------------------------------
  // searchMedicines
  // ---------------------------------------------------------------------------

  describe('searchMedicines', () => {
    it('returns catalog entries matching the query', async () => {
      noFailure();

      const promise = provider.searchMedicines('paracetamol');
      await flush();
      const results = await promise;

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(
        results.every((r) => r.name.toLowerCase().includes('paracetamol')),
      ).toBe(true);
    });

    it('returns dynamic results for an unknown query', async () => {
      noFailure();

      const promise = provider.searchMedicines('unknownXYZ');
      await flush();
      const results = await promise;

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].name.toLowerCase()).toContain('unknownxyz');
    });

    it('throws PharmacyTransientError on simulated failure', async () => {
      withFailure();

      const promise = provider.searchMedicines('ibuprofen');
      await flush();

      await expect(promise).rejects.toBeInstanceOf(PharmacyTransientError);
    });
  });

  // ---------------------------------------------------------------------------
  // checkAvailability
  // ---------------------------------------------------------------------------

  describe('checkAvailability', () => {
    it('returns available=true when random is above 0.2 threshold', async () => {
      // random > 0.2 → in-stock (0.5 satisfies both)
      noFailure();

      const promise = provider.checkAvailability('mock-med-001', '560001');
      await flush();
      const result = await promise;

      expect(result.medicineCode).toBe('mock-med-001');
      expect(result.pincode).toBe('560001');
      expect(result.available).toBe(true);
    });

    it('returns available=false when random is below 0.2 threshold', async () => {
      // 0.15 < 0.2 → out of stock, but 0.15 > 0.1 → no failure
      jest.spyOn(Math, 'random').mockReturnValue(0.15);

      const promise = provider.checkAvailability('mock-med-001', '110001');
      await flush();
      const result = await promise;

      expect(result.available).toBe(false);
      expect(result.reason).toBeTruthy();
    });

    it('throws PharmacyTransientError on simulated failure', async () => {
      withFailure();

      const promise = provider.checkAvailability('mock-med-001', '560001');
      await flush();

      await expect(promise).rejects.toBeInstanceOf(PharmacyTransientError);
    });
  });

  // ---------------------------------------------------------------------------
  // createOrder
  // ---------------------------------------------------------------------------

  describe('createOrder', () => {
    it('creates an order and stores it in the in-memory store', async () => {
      noFailure();

      const promise = provider.createOrder({
        patientId: 'patient-1',
        items: [
          {
            medicineCode: 'mock-med-001',
            medicineName: 'Paracetamol 500mg',
            quantity: 2,
            unitPrice: 10.5,
          },
        ],
        deliveryAddress: 'Street 1, Mumbai, MH, 400001',
      });
      await flush();
      const result = await promise;

      expect(result.partnerOrderId).toMatch(/^MOCK-ORD-/);
      expect(result.status).toBe('PLACED');
      expect(result.totalAmount).toBe(21);
      expect(result.items).toHaveLength(1);
    });

    it('computes totalAmount correctly for multiple items', async () => {
      noFailure();

      const promise = provider.createOrder({
        patientId: 'patient-1',
        items: [
          { medicineCode: 'a', medicineName: 'A', quantity: 3, unitPrice: 10 },
          { medicineCode: 'b', medicineName: 'B', quantity: 2, unitPrice: 25 },
        ],
        deliveryAddress: 'Somewhere',
      });
      await flush();
      const result = await promise;

      expect(result.totalAmount).toBe(80);
    });

    it('throws PharmacyTransientError on simulated failure', async () => {
      withFailure();

      const promise = provider.createOrder({
        patientId: 'patient-1',
        items: [],
        deliveryAddress: 'Addr',
      });
      await flush();

      await expect(promise).rejects.toBeInstanceOf(PharmacyTransientError);
    });
  });

  // ---------------------------------------------------------------------------
  // getOrderStatus — status progression
  // ---------------------------------------------------------------------------

  describe('getOrderStatus', () => {
    it('returns PLACED for an order with no prior state', async () => {
      noFailure();

      const promise = provider.getOrderStatus('non-existent-id');
      await flush();
      const result = await promise;

      expect(result.status).toBe('PLACED');
    });

    it('advances status on each call: PLACED → CONFIRMED → PACKED …', async () => {
      noFailure();

      // Create the order first
      const createPromise = provider.createOrder({
        patientId: 'p1',
        items: [
          { medicineCode: 'x', medicineName: 'X', quantity: 1, unitPrice: 5 },
        ],
        deliveryAddress: 'Addr',
      });
      await flush();
      const { partnerOrderId } = await createPromise;

      // First status call: PLACED → CONFIRMED
      const p1 = provider.getOrderStatus(partnerOrderId);
      await flush();
      const s1 = await p1;
      expect(s1.status).toBe('CONFIRMED');

      // Second status call: CONFIRMED → PACKED
      const p2 = provider.getOrderStatus(partnerOrderId);
      await flush();
      const s2 = await p2;
      expect(s2.status).toBe('PACKED');
    });

    it('throws PharmacyTransientError on simulated failure', async () => {
      withFailure();

      const promise = provider.getOrderStatus('any-id');
      await flush();

      await expect(promise).rejects.toBeInstanceOf(PharmacyTransientError);
    });
  });

  // ---------------------------------------------------------------------------
  // cancelOrder
  // ---------------------------------------------------------------------------

  describe('cancelOrder', () => {
    it('returns cancelled=true and status CANCELLED', async () => {
      noFailure();

      const promise = provider.cancelOrder('any-order-id');
      await flush();
      const result = await promise;

      expect(result.cancelled).toBe(true);
      expect(result.status).toBe('CANCELLED');
    });

    it('persists CANCELLED status in the in-memory store', async () => {
      noFailure();

      // Create order
      const cp = provider.createOrder({
        patientId: 'p1',
        items: [
          { medicineCode: 'x', medicineName: 'X', quantity: 1, unitPrice: 5 },
        ],
        deliveryAddress: 'Addr',
      });
      await flush();
      const { partnerOrderId } = await cp;

      // Cancel it
      const cancelP = provider.cancelOrder(partnerOrderId);
      await flush();
      await cancelP;

      // Check status — should remain CANCELLED (no advancement)
      const sp = provider.getOrderStatus(partnerOrderId);
      await flush();
      const status = await sp;

      expect(status.status).toBe('CANCELLED');
    });

    it('throws PharmacyTransientError on simulated failure', async () => {
      withFailure();

      const promise = provider.cancelOrder('any-id');
      await flush();

      await expect(promise).rejects.toBeInstanceOf(PharmacyTransientError);
    });
  });

  // ---------------------------------------------------------------------------
  // simulateNextStatusEvent (webhook helper)
  // ---------------------------------------------------------------------------

  describe('simulateNextStatusEvent', () => {
    it('returns null for an unknown orderId', () => {
      const result = provider.simulateNextStatusEvent('ghost-id');
      expect(result).toBeNull();
    });

    it('advances status and returns an event object', async () => {
      noFailure();

      const cp = provider.createOrder({
        patientId: 'p1',
        items: [
          { medicineCode: 'x', medicineName: 'X', quantity: 1, unitPrice: 5 },
        ],
        deliveryAddress: 'Addr',
      });
      await flush();
      const { partnerOrderId } = await cp;

      const event = provider.simulateNextStatusEvent(partnerOrderId);
      expect(event).not.toBeNull();
      expect(event!.status).toBe('CONFIRMED');
      expect(event!.partnerOrderId).toBe(partnerOrderId);
    });

    it('returns null once order reaches terminal state DELIVERED', async () => {
      noFailure();

      const cp = provider.createOrder({
        patientId: 'p1',
        items: [
          { medicineCode: 'x', medicineName: 'X', quantity: 1, unitPrice: 5 },
        ],
        deliveryAddress: 'Addr',
      });
      await flush();
      const { partnerOrderId } = await cp;

      // Advance through all statuses: PLACED→CONFIRMED→PACKED→SHIPPED→OUT_FOR_DELIVERY→DELIVERED
      const statuses = [
        'CONFIRMED',
        'PACKED',
        'SHIPPED',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
      ];
      for (const expected of statuses) {
        const event = provider.simulateNextStatusEvent(partnerOrderId);
        expect(event!.status).toBe(expected);
      }

      // Now terminal — should return null
      const terminal = provider.simulateNextStatusEvent(partnerOrderId);
      expect(terminal).toBeNull();
    });
  });
});

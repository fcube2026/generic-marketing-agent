import { Injectable, Logger } from '@nestjs/common';
import {
  AvailabilityResult,
  CancelResponse,
  CreatePartnerOrder,
  MedicineResult,
  PartnerOrderResult,
  PartnerOrderStatus,
  PharmacyPartnerProvider,
} from './pharmacy-partner.interface';
import { PharmacyTransientError } from '../errors/pharmacy.errors';

// ---------------------------------------------------------------------------
// Static medicine catalog used by the mock
// ---------------------------------------------------------------------------

interface CatalogEntry {
  id: string;
  name: string;
  manufacturer: string;
  price: number;
  unit: string;
  requiresPrescription: boolean;
}

const MEDICINE_CATALOG: CatalogEntry[] = [
  {
    id: 'mock-med-001',
    name: 'Paracetamol 500mg',
    manufacturer: 'Mock Pharma Ltd.',
    price: 10.5,
    unit: 'strip of 10',
    requiresPrescription: false,
  },
  {
    id: 'mock-med-002',
    name: 'Paracetamol 250mg',
    manufacturer: 'Mock Pharma Ltd.',
    price: 6.0,
    unit: 'strip of 10',
    requiresPrescription: false,
  },
  {
    id: 'mock-med-003',
    name: 'Amoxicillin 500mg',
    manufacturer: 'Generic Meds Co.',
    price: 55.0,
    unit: 'strip of 10',
    requiresPrescription: true,
  },
  {
    id: 'mock-med-004',
    name: 'Ibuprofen 400mg',
    manufacturer: 'Mock Pharma Ltd.',
    price: 18.0,
    unit: 'strip of 15',
    requiresPrescription: false,
  },
  {
    id: 'mock-med-005',
    name: 'Cetirizine 10mg',
    manufacturer: 'Allergy Free Labs',
    price: 22.0,
    unit: 'strip of 10',
    requiresPrescription: false,
  },
  {
    id: 'mock-med-006',
    name: 'Metformin 500mg',
    manufacturer: 'Diabetes Care Inc.',
    price: 30.0,
    unit: 'strip of 20',
    requiresPrescription: true,
  },
  {
    id: 'mock-med-007',
    name: 'Omeprazole 20mg',
    manufacturer: 'Gastro Labs',
    price: 45.0,
    unit: 'strip of 14',
    requiresPrescription: false,
  },
  {
    id: 'mock-med-008',
    name: 'Azithromycin 500mg',
    manufacturer: 'Generic Meds Co.',
    price: 75.0,
    unit: 'strip of 5',
    requiresPrescription: true,
  },
];

/** Natural order-status progression. */
const STATUS_PROGRESSION = [
  'PLACED',
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
] as const;

type OrderStatus = (typeof STATUS_PROGRESSION)[number] | 'CANCELLED';

interface MockOrder {
  partnerOrderId: string;
  status: OrderStatus;
  totalAmount: number;
  items: CreatePartnerOrder['items'];
  createdAt: string;
  updatedAt: string;
}

/** Fraction of calls that will throw a `PharmacyTransientError`. */
const FAILURE_RATE = 0.1;

/** Simulate realistic network latency (ms). */
const LATENCY_MIN_MS = 300;
const LATENCY_MAX_MS = 800;

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

@Injectable()
export class MockPharmacyProvider implements PharmacyPartnerProvider {
  private readonly logger = new Logger(MockPharmacyProvider.name);

  /** Simple in-memory order store (keyed by partnerOrderId). */
  private readonly orderStore = new Map<string, MockOrder>();

  // -------------------------------------------------------------------------
  // PharmacyPartnerProvider implementation
  // -------------------------------------------------------------------------

  async searchMedicines(query: string): Promise<MedicineResult[]> {
    const start = Date.now();
    this.logger.log(`[mock] searchMedicines query="${query}"`);

    await this.simulateLatency();
    this.maybeSimulateFailure('searchMedicines');

    const lower = query.toLowerCase();
    const results = MEDICINE_CATALOG.filter((m) =>
      m.name.toLowerCase().includes(lower),
    );

    // Always return at least two generic results so callers always get data
    const finalResults: MedicineResult[] =
      results.length > 0
        ? results
        : [
            {
              id: `mock-dyn-${lower.replace(/\s+/g, '-')}-001`,
              name: `${query} 500mg`,
              manufacturer: 'Mock Pharma Ltd.',
              price: 12.0,
              unit: 'strip of 10',
              requiresPrescription: false,
            },
            {
              id: `mock-dyn-${lower.replace(/\s+/g, '-')}-002`,
              name: `${query} 250mg`,
              manufacturer: 'Mock Pharma Ltd.',
              price: 7.5,
              unit: 'strip of 10',
              requiresPrescription: false,
            },
          ];

    this.logger.log(
      `[mock] searchMedicines returned ${finalResults.length} result(s) in ${Date.now() - start}ms`,
    );
    return finalResults;
  }

  async checkAvailability(
    medicineCode: string,
    pincode: string,
  ): Promise<AvailabilityResult> {
    const start = Date.now();
    this.logger.log(
      `[mock] checkAvailability medicineCode="${medicineCode}" pincode="${pincode}"`,
    );

    await this.simulateLatency();
    this.maybeSimulateFailure('checkAvailability');

    // Randomise availability: ~80% in-stock
    const available = Math.random() > 0.2;

    this.logger.log(
      `[mock] checkAvailability result=${available ? 'IN_STOCK' : 'OUT_OF_STOCK'} in ${Date.now() - start}ms`,
    );
    return {
      medicineCode,
      pincode,
      available,
      reason: available ? undefined : 'Out of stock at this pincode',
    };
  }

  async createOrder(order: CreatePartnerOrder): Promise<PartnerOrderResult> {
    const start = Date.now();
    this.logger.log(
      `[mock] createOrder patientId="${order.patientId}" items=${order.items.length}`,
    );

    await this.simulateLatency();
    this.maybeSimulateFailure('createOrder');

    const partnerOrderId = `MOCK-ORD-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
    const totalAmount = order.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    const now = new Date().toISOString();

    const mockOrder: MockOrder = {
      partnerOrderId,
      status: 'PLACED',
      totalAmount,
      items: order.items,
      createdAt: now,
      updatedAt: now,
    };
    this.orderStore.set(partnerOrderId, mockOrder);

    this.logger.log(
      `[mock] createOrder created partnerOrderId="${partnerOrderId}" total=${totalAmount} in ${Date.now() - start}ms`,
    );
    return {
      partnerOrderId,
      status: mockOrder.status,
      totalAmount,
      items: order.items,
    };
  }

  async getOrderStatus(partnerOrderId: string): Promise<PartnerOrderStatus> {
    const start = Date.now();
    this.logger.log(`[mock] getOrderStatus partnerOrderId="${partnerOrderId}"`);

    await this.simulateLatency();
    this.maybeSimulateFailure('getOrderStatus');

    const order = this.orderStore.get(partnerOrderId);
    if (!order) {
      // Order not in store — simulate a "just created" PLACED status
      return {
        partnerOrderId,
        status: 'PLACED',
        updatedAt: new Date().toISOString(),
      };
    }

    // Automatically advance status to simulate progression
    const nextStatus = this.advanceStatus(order.status);
    if (nextStatus !== order.status) {
      order.status = nextStatus;
      order.updatedAt = new Date().toISOString();
    }

    this.logger.log(
      `[mock] getOrderStatus partnerOrderId="${partnerOrderId}" status="${order.status}" in ${Date.now() - start}ms`,
    );
    return {
      partnerOrderId,
      status: order.status,
      updatedAt: order.updatedAt,
    };
  }

  async cancelOrder(partnerOrderId: string): Promise<CancelResponse> {
    const start = Date.now();
    this.logger.log(`[mock] cancelOrder partnerOrderId="${partnerOrderId}"`);

    await this.simulateLatency();
    this.maybeSimulateFailure('cancelOrder');

    const order = this.orderStore.get(partnerOrderId);
    if (order) {
      order.status = 'CANCELLED';
      order.updatedAt = new Date().toISOString();
    }

    this.logger.log(
      `[mock] cancelOrder partnerOrderId="${partnerOrderId}" in ${Date.now() - start}ms`,
    );
    return {
      partnerOrderId,
      status: 'CANCELLED',
      cancelled: true,
    };
  }

  // -------------------------------------------------------------------------
  // Webhook simulation helper (called by PharmacyWebhookService)
  // -------------------------------------------------------------------------

  /**
   * Returns the next status in the progression for a given `partnerOrderId`,
   * or `null` if the order is already in a terminal state.
   */
  simulateNextStatusEvent(
    partnerOrderId: string,
  ): { partnerOrderId: string; status: string; updatedAt: string } | null {
    const order = this.orderStore.get(partnerOrderId);
    if (!order) return null;

    const next = this.advanceStatus(order.status);
    if (next === order.status) return null; // already terminal

    order.status = next;
    order.updatedAt = new Date().toISOString();

    return {
      partnerOrderId,
      status: order.status,
      updatedAt: order.updatedAt,
    };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /** Random delay between LATENCY_MIN_MS and LATENCY_MAX_MS. */
  private simulateLatency(): Promise<void> {
    const delay =
      LATENCY_MIN_MS + Math.random() * (LATENCY_MAX_MS - LATENCY_MIN_MS);
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Throws a `PharmacyTransientError` with probability FAILURE_RATE.
   * This simulates real-world intermittent API failures.
   */
  private maybeSimulateFailure(operation: string): void {
    if (Math.random() < FAILURE_RATE) {
      this.logger.warn(`[mock] Simulating failure in ${operation}`);
      throw new PharmacyTransientError(
        `Mock simulated transient failure in ${operation}`,
        { operation },
      );
    }
  }

  /** Advances an order to the next status in the progression (idempotent for terminals). */
  private advanceStatus(current: OrderStatus): OrderStatus {
    if (current === 'CANCELLED') return 'CANCELLED';
    const idx = STATUS_PROGRESSION.indexOf(
      current as (typeof STATUS_PROGRESSION)[number],
    );
    if (idx === -1 || idx === STATUS_PROGRESSION.length - 1) return current;
    return STATUS_PROGRESSION[idx + 1];
  }
}

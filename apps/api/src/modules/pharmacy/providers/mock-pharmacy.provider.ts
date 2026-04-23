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
  {
    id: 'mock-med-009',
    name: 'Dolo 650mg',
    manufacturer: 'Micro Labs',
    price: 32.0,
    unit: 'strip of 15',
    requiresPrescription: false,
  },
  {
    id: 'mock-med-010',
    name: 'Amoxicillin Clavulanate 625mg',
    manufacturer: 'MediCure Pharma',
    price: 180.0,
    unit: 'strip of 10',
    requiresPrescription: true,
  },
  {
    id: 'mock-med-011',
    name: 'Pantoprazole 40mg',
    manufacturer: 'Gastro Labs',
    price: 95.0,
    unit: 'strip of 15',
    requiresPrescription: false,
  },
  {
    id: 'mock-med-012',
    name: 'Ranitidine 150mg',
    manufacturer: 'StomachWell',
    price: 48.0,
    unit: 'strip of 15',
    requiresPrescription: false,
  },
  {
    id: 'mock-med-013',
    name: 'Levocetirizine 5mg',
    manufacturer: 'Allergy Free Labs',
    price: 52.0,
    unit: 'strip of 10',
    requiresPrescription: false,
  },
  {
    id: 'mock-med-014',
    name: 'Montelukast 10mg',
    manufacturer: 'RespiraCare',
    price: 135.0,
    unit: 'strip of 15',
    requiresPrescription: true,
  },
  {
    id: 'mock-med-015',
    name: 'Telmisartan 40mg',
    manufacturer: 'CardioLife',
    price: 165.0,
    unit: 'strip of 15',
    requiresPrescription: true,
  },
  {
    id: 'mock-med-016',
    name: 'Amlodipine 5mg',
    manufacturer: 'CardioLife',
    price: 72.0,
    unit: 'strip of 15',
    requiresPrescription: true,
  },
  {
    id: 'mock-med-017',
    name: 'Atorvastatin 10mg',
    manufacturer: 'HeartSafe Drugs',
    price: 118.0,
    unit: 'strip of 15',
    requiresPrescription: true,
  },
  {
    id: 'mock-med-018',
    name: 'Rosuvastatin 20mg',
    manufacturer: 'HeartSafe Drugs',
    price: 210.0,
    unit: 'strip of 10',
    requiresPrescription: true,
  },
  {
    id: 'mock-med-019',
    name: 'Metformin 1000mg',
    manufacturer: 'Diabetes Care Inc.',
    price: 82.0,
    unit: 'strip of 15',
    requiresPrescription: true,
  },
  {
    id: 'mock-med-020',
    name: 'Glimepiride 2mg',
    manufacturer: 'Diabetes Care Inc.',
    price: 96.0,
    unit: 'strip of 15',
    requiresPrescription: true,
  },
  {
    id: 'mock-med-021',
    name: 'Sitagliptin 50mg',
    manufacturer: 'Diabetes Care Inc.',
    price: 420.0,
    unit: 'strip of 14',
    requiresPrescription: true,
  },
  {
    id: 'mock-med-022',
    name: 'Diclofenac 50mg',
    manufacturer: 'PainRelief Pharma',
    price: 34.0,
    unit: 'strip of 10',
    requiresPrescription: false,
  },
  {
    id: 'mock-med-023',
    name: 'Aceclofenac 100mg',
    manufacturer: 'PainRelief Pharma',
    price: 74.0,
    unit: 'strip of 10',
    requiresPrescription: true,
  },
  {
    id: 'mock-med-024',
    name: 'Mefenamic Acid 500mg',
    manufacturer: 'PainRelief Pharma',
    price: 58.0,
    unit: 'strip of 10',
    requiresPrescription: false,
  },
  {
    id: 'mock-med-025',
    name: 'Ondansetron 4mg',
    manufacturer: 'NauseaCare',
    price: 90.0,
    unit: 'strip of 10',
    requiresPrescription: true,
  },
  {
    id: 'mock-med-026',
    name: 'Domperidone 10mg',
    manufacturer: 'NauseaCare',
    price: 62.0,
    unit: 'strip of 10',
    requiresPrescription: false,
  },
  {
    id: 'mock-med-027',
    name: 'ORS Powder',
    manufacturer: 'HydraLabs',
    price: 22.0,
    unit: 'pack of 5 sachets',
    requiresPrescription: false,
  },
  {
    id: 'mock-med-028',
    name: 'Vitamin D3 60000 IU',
    manufacturer: 'NutriHealth',
    price: 135.0,
    unit: 'strip of 4',
    requiresPrescription: false,
  },
  {
    id: 'mock-med-029',
    name: 'Multivitamin Capsules',
    manufacturer: 'NutriHealth',
    price: 160.0,
    unit: 'bottle of 30',
    requiresPrescription: false,
  },
  {
    id: 'mock-med-030',
    name: 'Cough Syrup DX',
    manufacturer: 'RespiraCare',
    price: 98.0,
    unit: 'bottle of 100 ml',
    requiresPrescription: false,
  },
  {
    id: 'mock-med-031',
    name: 'Metronidazole 400mg',
    manufacturer: 'Generic Meds Co.',
    price: 64.0,
    unit: 'strip of 10',
    requiresPrescription: true,
  },
];

const GENERATED_MEDICINE_NAMES = [
  'Losartan',
  'Aspirin',
  'Clopidogrel',
  'Hydroxychloroquine',
  'Doxycycline',
  'Cefixime',
  'Levothyroxine',
  'Escitalopram',
  'Sertraline',
  'Alprazolam',
  'Pregabalin',
  'Gabapentin',
  'Tramadol',
  'Fluconazole',
  'Itraconazole',
  'Rifaximin',
  'Loperamide',
  'Rabeprazole',
  'Famotidine',
  'Clarithromycin',
] as const;

const GENERATED_STRENGTHS = [
  '5mg',
  '10mg',
  '20mg',
  '40mg',
  '50mg',
  '100mg',
] as const;

const GENERATED_MANUFACTURERS = [
  'NovaCure Pharma',
  'Zenwell Labs',
  'HealthAxis',
  'PrimeMeds',
  'VitaCore',
] as const;

const GENERATED_UNITS = ['strip of 10', 'strip of 15', 'strip of 20'] as const;

// Legal-safety first: generated molecules are treated as Rx by default.
// This avoids unsafe OTC exposure and guarantees consistent classification
// across strengths/variants of the same molecule.
const GENERATED_RX_REQUIRED_BASES = new Set<string>([
  ...GENERATED_MEDICINE_NAMES,
]);

const TOTAL_MOCK_MEDICINES = 150;

const generatedMedicines: CatalogEntry[] = [];
const generatedCount = Math.max(
  TOTAL_MOCK_MEDICINES - MEDICINE_CATALOG.length,
  0,
);

function normalizeMedicineBaseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b\d+(?:\.\d+)?\s*(mg|g|mcg|iu|ml)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function assertConsistentPrescriptionClassification(
  catalog: CatalogEntry[],
): void {
  const byBaseName = new Map<string, boolean>();

  for (const item of catalog) {
    const baseName = normalizeMedicineBaseName(item.name);
    const existing = byBaseName.get(baseName);

    if (existing === undefined) {
      byBaseName.set(baseName, item.requiresPrescription);
      continue;
    }

    if (existing !== item.requiresPrescription) {
      throw new Error(
        `Inconsistent Rx classification detected for medicine base "${baseName}". ` +
          'A medicine cannot be both OTC and prescription-required.',
      );
    }
  }
}

for (let i = 0; i < generatedCount; i += 1) {
  const medicineName =
    GENERATED_MEDICINE_NAMES[i % GENERATED_MEDICINE_NAMES.length];
  const strength =
    GENERATED_STRENGTHS[
      Math.floor(i / GENERATED_MEDICINE_NAMES.length) %
        GENERATED_STRENGTHS.length
    ];
  const manufacturer =
    GENERATED_MANUFACTURERS[i % GENERATED_MANUFACTURERS.length];
  const unit = GENERATED_UNITS[i % GENERATED_UNITS.length];
  const sequence = MEDICINE_CATALOG.length + i + 1;
  const requiresPrescription = GENERATED_RX_REQUIRED_BASES.has(medicineName);
  const basePrice = 28 + ((i * 7) % 310);
  const strengthMultiplier =
    (Math.floor(i / GENERATED_MEDICINE_NAMES.length) %
      GENERATED_STRENGTHS.length) *
    3;
  const price = Number((basePrice + strengthMultiplier + 0.5).toFixed(1));

  generatedMedicines.push({
    id: `mock-med-${String(sequence).padStart(3, '0')}`,
    name: `${medicineName} ${strength}`,
    manufacturer,
    price,
    unit,
    requiresPrescription,
  });
}

MEDICINE_CATALOG.push(...generatedMedicines);
assertConsistentPrescriptionClassification(MEDICINE_CATALOG);

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
    // If query is empty, return full catalog. Otherwise prefix-match.
    // Cap to first 10 results so the dropdown stays usable.
    const finalResults: MedicineResult[] = MEDICINE_CATALOG.filter((m) =>
      lower.length === 0 ? true : m.name.toLowerCase().startsWith(lower),
    ).slice(0, 10);

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

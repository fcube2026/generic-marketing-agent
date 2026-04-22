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
  composition: string;
  price: number;
  unit: string;
  available: boolean;
  requiresPrescription: boolean;
}

// ---------------------------------------------------------------------------
// Realistic mock medicine dataset (~70 entries).
// Mix of OTC and prescription-required items, with prices spanning ₹10 – ₹500+.
// Each entry carries: name, composition, price, availability and the
// prescriptionRequired flag — mirroring what a real pharmacy backend would
// expose. The dataset is intentionally diverse (different starting letters)
// so prefix-matching searches return meaningful subsets.
// ---------------------------------------------------------------------------
const MEDICINE_CATALOG: CatalogEntry[] = [
  // — Pain relief / fever (OTC) —
  {
    id: 'mock-med-001',
    name: 'Paracetamol 500mg',
    manufacturer: 'Mock Pharma Ltd.',
    composition: 'Paracetamol 500mg',
    price: 10.5,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: false,
  },
  {
    id: 'mock-med-002',
    name: 'Paracetamol 250mg',
    manufacturer: 'Mock Pharma Ltd.',
    composition: 'Paracetamol 250mg',
    price: 6.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: false,
  },
  {
    id: 'mock-med-003',
    name: 'Paracetamol 650mg',
    manufacturer: 'Mock Pharma Ltd.',
    composition: 'Paracetamol 650mg',
    price: 18.0,
    unit: 'strip of 15',
    available: true,
    requiresPrescription: false,
  },
  {
    id: 'mock-med-004',
    name: 'Ibuprofen 200mg',
    manufacturer: 'Mock Pharma Ltd.',
    composition: 'Ibuprofen 200mg',
    price: 14.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: false,
  },
  {
    id: 'mock-med-005',
    name: 'Ibuprofen 400mg',
    manufacturer: 'Mock Pharma Ltd.',
    composition: 'Ibuprofen 400mg',
    price: 18.0,
    unit: 'strip of 15',
    available: true,
    requiresPrescription: false,
  },
  {
    id: 'mock-med-006',
    name: 'Aspirin 75mg',
    manufacturer: 'CardioCare',
    composition: 'Acetylsalicylic Acid 75mg',
    price: 12.0,
    unit: 'strip of 14',
    available: true,
    requiresPrescription: false,
  },
  {
    id: 'mock-med-007',
    name: 'Aspirin 150mg',
    manufacturer: 'CardioCare',
    composition: 'Acetylsalicylic Acid 150mg',
    price: 16.5,
    unit: 'strip of 14',
    available: true,
    requiresPrescription: false,
  },
  {
    id: 'mock-med-008',
    name: 'Diclofenac 50mg',
    manufacturer: 'PainAway Labs',
    composition: 'Diclofenac Sodium 50mg',
    price: 28.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-009',
    name: 'Naproxen 250mg',
    manufacturer: 'PainAway Labs',
    composition: 'Naproxen 250mg',
    price: 65.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-010',
    name: 'Tramadol 50mg',
    manufacturer: 'AnalgesiPharm',
    composition: 'Tramadol HCl 50mg',
    price: 95.0,
    unit: 'strip of 10',
    available: false,
    requiresPrescription: true,
  },

  // — Antibiotics (Rx) —
  {
    id: 'mock-med-011',
    name: 'Amoxicillin 250mg',
    manufacturer: 'Generic Meds Co.',
    composition: 'Amoxicillin 250mg',
    price: 42.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-012',
    name: 'Amoxicillin 500mg',
    manufacturer: 'Generic Meds Co.',
    composition: 'Amoxicillin 500mg',
    price: 55.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-013',
    name: 'Azithromycin 250mg',
    manufacturer: 'Generic Meds Co.',
    composition: 'Azithromycin 250mg',
    price: 60.0,
    unit: 'strip of 6',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-014',
    name: 'Azithromycin 500mg',
    manufacturer: 'Generic Meds Co.',
    composition: 'Azithromycin 500mg',
    price: 75.0,
    unit: 'strip of 5',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-015',
    name: 'Ciprofloxacin 500mg',
    manufacturer: 'CipraMed',
    composition: 'Ciprofloxacin 500mg',
    price: 88.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-016',
    name: 'Doxycycline 100mg',
    manufacturer: 'CipraMed',
    composition: 'Doxycycline 100mg',
    price: 70.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-017',
    name: 'Cefixime 200mg',
    manufacturer: 'AntibioCare',
    composition: 'Cefixime 200mg',
    price: 110.0,
    unit: 'strip of 10',
    available: false,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-018',
    name: 'Clarithromycin 500mg',
    manufacturer: 'AntibioCare',
    composition: 'Clarithromycin 500mg',
    price: 220.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-019',
    name: 'Levofloxacin 500mg',
    manufacturer: 'CipraMed',
    composition: 'Levofloxacin 500mg',
    price: 145.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-020',
    name: 'Metronidazole 400mg',
    manufacturer: 'Generic Meds Co.',
    composition: 'Metronidazole 400mg',
    price: 36.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: true,
  },

  // — Allergy / antihistamines —
  {
    id: 'mock-med-021',
    name: 'Cetirizine 5mg',
    manufacturer: 'Allergy Free Labs',
    composition: 'Cetirizine 5mg',
    price: 14.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: false,
  },
  {
    id: 'mock-med-022',
    name: 'Cetirizine 10mg',
    manufacturer: 'Allergy Free Labs',
    composition: 'Cetirizine 10mg',
    price: 22.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: false,
  },
  {
    id: 'mock-med-023',
    name: 'Loratadine 10mg',
    manufacturer: 'Allergy Free Labs',
    composition: 'Loratadine 10mg',
    price: 32.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: false,
  },
  {
    id: 'mock-med-024',
    name: 'Fexofenadine 120mg',
    manufacturer: 'Allergy Free Labs',
    composition: 'Fexofenadine HCl 120mg',
    price: 78.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: false,
  },
  {
    id: 'mock-med-025',
    name: 'Levocetirizine 5mg',
    manufacturer: 'Allergy Free Labs',
    composition: 'Levocetirizine 5mg',
    price: 48.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: false,
  },
  {
    id: 'mock-med-026',
    name: 'Montelukast 10mg',
    manufacturer: 'RespiraCare',
    composition: 'Montelukast Sodium 10mg',
    price: 165.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: true,
  },

  // — Gastro / acidity —
  {
    id: 'mock-med-027',
    name: 'Omeprazole 20mg',
    manufacturer: 'Gastro Labs',
    composition: 'Omeprazole 20mg',
    price: 45.0,
    unit: 'strip of 14',
    available: true,
    requiresPrescription: false,
  },
  {
    id: 'mock-med-028',
    name: 'Omeprazole 40mg',
    manufacturer: 'Gastro Labs',
    composition: 'Omeprazole 40mg',
    price: 78.0,
    unit: 'strip of 14',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-029',
    name: 'Pantoprazole 40mg',
    manufacturer: 'Gastro Labs',
    composition: 'Pantoprazole 40mg',
    price: 92.0,
    unit: 'strip of 15',
    available: true,
    requiresPrescription: false,
  },
  {
    id: 'mock-med-030',
    name: 'Rabeprazole 20mg',
    manufacturer: 'Gastro Labs',
    composition: 'Rabeprazole 20mg',
    price: 110.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-031',
    name: 'Ranitidine 150mg',
    manufacturer: 'Gastro Labs',
    composition: 'Ranitidine 150mg',
    price: 28.0,
    unit: 'strip of 10',
    available: false,
    requiresPrescription: false,
  },
  {
    id: 'mock-med-032',
    name: 'Domperidone 10mg',
    manufacturer: 'Gastro Labs',
    composition: 'Domperidone 10mg',
    price: 38.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-033',
    name: 'Ondansetron 4mg',
    manufacturer: 'NauseaFree',
    composition: 'Ondansetron 4mg',
    price: 56.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: true,
  },

  // — Diabetes (Rx) —
  {
    id: 'mock-med-034',
    name: 'Metformin 500mg',
    manufacturer: 'Diabetes Care Inc.',
    composition: 'Metformin HCl 500mg',
    price: 30.0,
    unit: 'strip of 20',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-035',
    name: 'Metformin 1000mg',
    manufacturer: 'Diabetes Care Inc.',
    composition: 'Metformin HCl 1000mg',
    price: 52.0,
    unit: 'strip of 20',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-036',
    name: 'Glimepiride 1mg',
    manufacturer: 'Diabetes Care Inc.',
    composition: 'Glimepiride 1mg',
    price: 68.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-037',
    name: 'Glimepiride 2mg',
    manufacturer: 'Diabetes Care Inc.',
    composition: 'Glimepiride 2mg',
    price: 95.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-038',
    name: 'Sitagliptin 100mg',
    manufacturer: 'Diabetes Care Inc.',
    composition: 'Sitagliptin Phosphate 100mg',
    price: 320.0,
    unit: 'strip of 7',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-039',
    name: 'Insulin Glargine 100IU/ml',
    manufacturer: 'BioInsulin Corp.',
    composition: 'Insulin Glargine 100IU/ml',
    price: 520.0,
    unit: 'cartridge 3ml',
    available: false,
    requiresPrescription: true,
  },

  // — Cardiac / BP (Rx) —
  {
    id: 'mock-med-040',
    name: 'Amlodipine 5mg',
    manufacturer: 'CardioCare',
    composition: 'Amlodipine Besylate 5mg',
    price: 36.0,
    unit: 'strip of 15',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-041',
    name: 'Amlodipine 10mg',
    manufacturer: 'CardioCare',
    composition: 'Amlodipine Besylate 10mg',
    price: 48.0,
    unit: 'strip of 15',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-042',
    name: 'Atenolol 50mg',
    manufacturer: 'CardioCare',
    composition: 'Atenolol 50mg',
    price: 22.0,
    unit: 'strip of 14',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-043',
    name: 'Losartan 50mg',
    manufacturer: 'CardioCare',
    composition: 'Losartan Potassium 50mg',
    price: 64.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-044',
    name: 'Telmisartan 40mg',
    manufacturer: 'CardioCare',
    composition: 'Telmisartan 40mg',
    price: 88.0,
    unit: 'strip of 15',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-045',
    name: 'Atorvastatin 10mg',
    manufacturer: 'LipidCare',
    composition: 'Atorvastatin Calcium 10mg',
    price: 72.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-046',
    name: 'Atorvastatin 20mg',
    manufacturer: 'LipidCare',
    composition: 'Atorvastatin Calcium 20mg',
    price: 110.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-047',
    name: 'Rosuvastatin 10mg',
    manufacturer: 'LipidCare',
    composition: 'Rosuvastatin Calcium 10mg',
    price: 145.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-048',
    name: 'Clopidogrel 75mg',
    manufacturer: 'CardioCare',
    composition: 'Clopidogrel Bisulphate 75mg',
    price: 95.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: true,
  },

  // — Respiratory —
  {
    id: 'mock-med-049',
    name: 'Salbutamol Inhaler 100mcg',
    manufacturer: 'RespiraCare',
    composition: 'Salbutamol Sulphate 100mcg/dose',
    price: 195.0,
    unit: 'inhaler 200 doses',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-050',
    name: 'Budesonide Inhaler 200mcg',
    manufacturer: 'RespiraCare',
    composition: 'Budesonide 200mcg/dose',
    price: 380.0,
    unit: 'inhaler 200 doses',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-051',
    name: 'Dextromethorphan Syrup',
    manufacturer: 'CoughRelief',
    composition: 'Dextromethorphan HBr 10mg/5ml',
    price: 85.0,
    unit: 'bottle 100ml',
    available: true,
    requiresPrescription: false,
  },
  {
    id: 'mock-med-052',
    name: 'Ambroxol Syrup',
    manufacturer: 'CoughRelief',
    composition: 'Ambroxol HCl 30mg/5ml',
    price: 92.0,
    unit: 'bottle 100ml',
    available: true,
    requiresPrescription: false,
  },

  // — Vitamins / supplements (OTC) —
  {
    id: 'mock-med-053',
    name: 'Vitamin C 500mg',
    manufacturer: 'NutriHealth',
    composition: 'Ascorbic Acid 500mg',
    price: 120.0,
    unit: 'bottle of 30',
    available: true,
    requiresPrescription: false,
  },
  {
    id: 'mock-med-054',
    name: 'Vitamin D3 60000IU',
    manufacturer: 'NutriHealth',
    composition: 'Cholecalciferol 60000IU',
    price: 75.0,
    unit: 'strip of 4',
    available: true,
    requiresPrescription: false,
  },
  {
    id: 'mock-med-055',
    name: 'Vitamin B-Complex',
    manufacturer: 'NutriHealth',
    composition: 'B1+B2+B3+B5+B6+B12 complex',
    price: 145.0,
    unit: 'bottle of 30',
    available: true,
    requiresPrescription: false,
  },
  {
    id: 'mock-med-056',
    name: 'Calcium + Vitamin D3',
    manufacturer: 'NutriHealth',
    composition: 'Calcium Carbonate 500mg + Vit D3 250IU',
    price: 168.0,
    unit: 'strip of 15',
    available: true,
    requiresPrescription: false,
  },
  {
    id: 'mock-med-057',
    name: 'Iron + Folic Acid',
    manufacturer: 'NutriHealth',
    composition: 'Ferrous Fumarate 152mg + Folic Acid 1.5mg',
    price: 95.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: false,
  },
  {
    id: 'mock-med-058',
    name: 'Zinc 50mg',
    manufacturer: 'NutriHealth',
    composition: 'Zinc Sulphate 50mg',
    price: 88.0,
    unit: 'bottle of 30',
    available: true,
    requiresPrescription: false,
  },
  {
    id: 'mock-med-059',
    name: 'Multivitamin Daily',
    manufacturer: 'NutriHealth',
    composition: 'Multivitamin + Multimineral blend',
    price: 240.0,
    unit: 'bottle of 30',
    available: true,
    requiresPrescription: false,
  },
  {
    id: 'mock-med-060',
    name: 'Omega-3 Fish Oil 1000mg',
    manufacturer: 'NutriHealth',
    composition: 'Fish Oil 1000mg (EPA+DHA)',
    price: 320.0,
    unit: 'bottle of 60',
    available: true,
    requiresPrescription: false,
  },

  // — ORS / hydration / topical (OTC) —
  {
    id: 'mock-med-061',
    name: 'ORS Powder Sachet',
    manufacturer: 'HydraLife',
    composition: 'WHO ORS formula 21.8g',
    price: 22.0,
    unit: 'sachet',
    available: true,
    requiresPrescription: false,
  },
  {
    id: 'mock-med-062',
    name: 'Povidone Iodine Solution 5%',
    manufacturer: 'AntisepCare',
    composition: 'Povidone Iodine 5% w/v',
    price: 65.0,
    unit: 'bottle 100ml',
    available: true,
    requiresPrescription: false,
  },
  {
    id: 'mock-med-063',
    name: 'Hydrogen Peroxide 3%',
    manufacturer: 'AntisepCare',
    composition: 'Hydrogen Peroxide 3% w/v',
    price: 45.0,
    unit: 'bottle 100ml',
    available: true,
    requiresPrescription: false,
  },
  {
    id: 'mock-med-064',
    name: 'Bandage Roll 4 inch',
    manufacturer: 'WoundCare',
    composition: 'Cotton crepe bandage',
    price: 38.0,
    unit: 'roll',
    available: true,
    requiresPrescription: false,
  },

  // — Mental health / sleep (Rx) —
  {
    id: 'mock-med-065',
    name: 'Sertraline 50mg',
    manufacturer: 'NeuroMed',
    composition: 'Sertraline HCl 50mg',
    price: 220.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-066',
    name: 'Escitalopram 10mg',
    manufacturer: 'NeuroMed',
    composition: 'Escitalopram Oxalate 10mg',
    price: 185.0,
    unit: 'strip of 10',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-067',
    name: 'Alprazolam 0.5mg',
    manufacturer: 'NeuroMed',
    composition: 'Alprazolam 0.5mg',
    price: 60.0,
    unit: 'strip of 10',
    available: false,
    requiresPrescription: true,
  },

  // — Thyroid / hormones (Rx) —
  {
    id: 'mock-med-068',
    name: 'Levothyroxine 50mcg',
    manufacturer: 'EndoCare',
    composition: 'Levothyroxine Sodium 50mcg',
    price: 95.0,
    unit: 'strip of 30',
    available: true,
    requiresPrescription: true,
  },
  {
    id: 'mock-med-069',
    name: 'Levothyroxine 100mcg',
    manufacturer: 'EndoCare',
    composition: 'Levothyroxine Sodium 100mcg',
    price: 145.0,
    unit: 'strip of 30',
    available: true,
    requiresPrescription: true,
  },

  // — Misc OTC —
  {
    id: 'mock-med-070',
    name: 'Lactulose Solution',
    manufacturer: 'Gastro Labs',
    composition: 'Lactulose 10g/15ml',
    price: 165.0,
    unit: 'bottle 200ml',
    available: true,
    requiresPrescription: false,
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

    const lower = query.trim().toLowerCase();
    // Empty query → return no medicines. A real pharmacy backend does not
    // dump its full catalog into the UI on screen-load; results should only
    // come from an explicit search (or a prescription-based fetch).
    if (lower.length === 0) {
      this.logger.log(
        `[mock] searchMedicines empty query → 0 result(s) in ${Date.now() - start}ms`,
      );
      return [];
    }

    // Prefix-match on name. Cap to first 10 results so the dropdown stays usable.
    const finalResults: MedicineResult[] = MEDICINE_CATALOG.filter((m) =>
      m.name.toLowerCase().startsWith(lower),
    )
      .slice(0, 10)
      .map((m) => ({
        id: m.id,
        name: m.name,
        manufacturer: m.manufacturer,
        price: m.price,
        unit: m.unit,
        requiresPrescription: m.requiresPrescription,
      }));

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

import { create } from 'zustand';

/** A medicine item in the prescription order */
export interface PrescriptionMedicine {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
}

/** A mock pharmacy option */
export interface MockPharmacy {
  id: string;
  name: string;
  estimatedDelivery: string;
  deliveryFee: number;
}

interface PharmacyOrderState {
  /** URL of the uploaded/selected prescription image */
  prescriptionUrl: string | null;
  /** Whether a prescription upload is in progress */
  isUploading: boolean;
  /** Error message from the last upload attempt */
  uploadError: string | null;
  /** Parsed/mock medicines from the prescription */
  medicines: PrescriptionMedicine[];
  /** The pharmacy selected by the user */
  selectedPharmacy: MockPharmacy | null;

  // -- Actions --
  setPrescription: (url: string) => void;
  clearPrescription: () => void;
  setUploading: (uploading: boolean) => void;
  setUploadError: (error: string | null) => void;
  setMedicines: (medicines: PrescriptionMedicine[]) => void;
  updateMedicineQuantity: (id: number, delta: number) => void;
  selectPharmacy: (pharmacy: MockPharmacy | null) => void;
  resetOrder: () => void;
}

/** Mock medicine data returned after a prescription is uploaded */
export const MOCK_MEDICINES: PrescriptionMedicine[] = [
  { id: 1, name: 'Paracetamol 500mg', quantity: 1, unitPrice: 25 },
  { id: 2, name: 'Azithromycin 250mg', quantity: 1, unitPrice: 85 },
  { id: 3, name: 'Cetirizine 10mg', quantity: 1, unitPrice: 15 },
];

/** Mock pharmacy options */
export const MOCK_PHARMACIES: MockPharmacy[] = [
  {
    id: 'curex-pharmacy',
    name: 'Curex Pharmacy (Mock)',
    estimatedDelivery: '30–45 min',
    deliveryFee: 40,
  },
  {
    id: 'fastmeds',
    name: 'FastMeds (Mock)',
    estimatedDelivery: '60–90 min',
    deliveryFee: 25,
  },
];

const initialState = {
  prescriptionUrl: null,
  isUploading: false,
  uploadError: null,
  medicines: [],
  selectedPharmacy: null,
};

export const usePharmacyOrderStore = create<PharmacyOrderState>((set) => ({
  ...initialState,

  setPrescription: (url) =>
    set({
      prescriptionUrl: url,
      uploadError: null,
      // Populate mock medicines when a prescription is provided
      medicines: MOCK_MEDICINES.map((m) => ({ ...m })),
    }),

  clearPrescription: () =>
    set({ prescriptionUrl: null, medicines: [], uploadError: null }),

  setUploading: (uploading) => set({ isUploading: uploading }),

  setUploadError: (error) => set({ uploadError: error }),

  setMedicines: (medicines) => set({ medicines }),

  updateMedicineQuantity: (id, delta) =>
    set((state) => ({
      medicines: state.medicines
        .map((m) =>
          m.id === id ? { ...m, quantity: Math.max(0, m.quantity + delta) } : m,
        )
        .filter((m) => m.quantity > 0),
    })),

  selectPharmacy: (pharmacy) => set({ selectedPharmacy: pharmacy }),

  resetOrder: () => set(initialState),
}));

/** Compute the total price (medicines subtotal + delivery fee) */
export function computeTotal(
  medicines: PrescriptionMedicine[],
  pharmacy: MockPharmacy | null,
): number {
  const subtotal = medicines.reduce(
    (sum, m) => sum + m.unitPrice * m.quantity,
    0,
  );
  return subtotal + (pharmacy?.deliveryFee ?? 0);
}

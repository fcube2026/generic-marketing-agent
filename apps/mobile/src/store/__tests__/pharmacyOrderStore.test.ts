/**
 * Unit tests for the pharmacy order Zustand store.
 *
 * Tests interact with the store directly (no UI rendering).
 * Each test resets the store to its initial state via `resetStore()`
 * so that no test depends on another.
 */
import {
  usePharmacyOrderStore,
  computeTotal,
  MOCK_MEDICINES,
  MOCK_PHARMACIES,
  type PrescriptionMedicine,
} from '../pharmacyOrderStore';

const resetStore = () => {
  usePharmacyOrderStore.setState({
    prescriptionUrl: null,
    isUploading: false,
    uploadError: null,
    medicines: [],
    uploadedPrescriptionId: null,
    uploadedPrescriptionStatus: null,
    selectedPharmacy: null,
  });
};

describe('pharmacyOrderStore', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('initial state', () => {
    it('exposes the documented default values', () => {
      const state = usePharmacyOrderStore.getState();
      expect(state.prescriptionUrl).toBeNull();
      expect(state.isUploading).toBe(false);
      expect(state.uploadError).toBeNull();
      expect(state.medicines).toEqual([]);
      expect(state.uploadedPrescriptionId).toBeNull();
      expect(state.uploadedPrescriptionStatus).toBeNull();
      expect(state.selectedPharmacy).toBeNull();
    });

    it('exposes mock catalogs', () => {
      expect(MOCK_MEDICINES.length).toBeGreaterThan(0);
      expect(MOCK_PHARMACIES.length).toBeGreaterThan(0);
    });
  });

  describe('prescription actions', () => {
    it('setPrescription stores url and clears upload error', () => {
      usePharmacyOrderStore.getState().setUploadError('boom');
      usePharmacyOrderStore.getState().setPrescription('file://rx.jpg');

      const state = usePharmacyOrderStore.getState();
      expect(state.prescriptionUrl).toBe('file://rx.jpg');
      expect(state.uploadError).toBeNull();
    });

    it('clearPrescription resets prescription, medicines, error and metadata', () => {
      const s = usePharmacyOrderStore.getState();
      s.setPrescription('file://rx.jpg');
      s.setMedicines([{ id: 1, name: 'Paracetamol', quantity: 2, unitPrice: 10 }]);
      s.setUploadError('something');
      s.setUploadedPrescriptionMeta('rx-1', 'PENDING_REVIEW');

      usePharmacyOrderStore.getState().clearPrescription();

      const state = usePharmacyOrderStore.getState();
      expect(state.prescriptionUrl).toBeNull();
      expect(state.medicines).toEqual([]);
      expect(state.uploadError).toBeNull();
      expect(state.uploadedPrescriptionId).toBeNull();
      expect(state.uploadedPrescriptionStatus).toBeNull();
    });

    it('setUploading toggles the uploading flag', () => {
      usePharmacyOrderStore.getState().setUploading(true);
      expect(usePharmacyOrderStore.getState().isUploading).toBe(true);
      usePharmacyOrderStore.getState().setUploading(false);
      expect(usePharmacyOrderStore.getState().isUploading).toBe(false);
    });

    it('setUploadedPrescriptionMeta records id + status', () => {
      usePharmacyOrderStore
        .getState()
        .setUploadedPrescriptionMeta('rx-42', 'APPROVED');
      const state = usePharmacyOrderStore.getState();
      expect(state.uploadedPrescriptionId).toBe('rx-42');
      expect(state.uploadedPrescriptionStatus).toBe('APPROVED');
    });
  });

  describe('medicines', () => {
    it('setMedicines replaces the list', () => {
      const meds: PrescriptionMedicine[] = [
        { id: 1, name: 'A', quantity: 1, unitPrice: 10 },
        { id: 2, name: 'B', quantity: 3, unitPrice: 25 },
      ];
      usePharmacyOrderStore.getState().setMedicines(meds);
      expect(usePharmacyOrderStore.getState().medicines).toEqual(meds);
    });

    it('updateMedicineQuantity increments quantity', () => {
      usePharmacyOrderStore.getState().setMedicines([
        { id: 1, name: 'A', quantity: 1, unitPrice: 10 },
      ]);
      usePharmacyOrderStore.getState().updateMedicineQuantity(1, 2);
      expect(usePharmacyOrderStore.getState().medicines[0].quantity).toBe(3);
    });

    it('updateMedicineQuantity removes a medicine when quantity reaches zero', () => {
      usePharmacyOrderStore.getState().setMedicines([
        { id: 1, name: 'A', quantity: 1, unitPrice: 10 },
        { id: 2, name: 'B', quantity: 2, unitPrice: 20 },
      ]);
      usePharmacyOrderStore.getState().updateMedicineQuantity(1, -1);
      const meds = usePharmacyOrderStore.getState().medicines;
      expect(meds).toHaveLength(1);
      expect(meds[0].id).toBe(2);
    });

    it('updateMedicineQuantity never goes below zero (clamped + filtered)', () => {
      usePharmacyOrderStore.getState().setMedicines([
        { id: 1, name: 'A', quantity: 1, unitPrice: 10 },
      ]);
      usePharmacyOrderStore.getState().updateMedicineQuantity(1, -10);
      expect(usePharmacyOrderStore.getState().medicines).toEqual([]);
    });

    it('updateMedicineQuantity is a no-op for unknown ids', () => {
      const meds: PrescriptionMedicine[] = [
        { id: 1, name: 'A', quantity: 2, unitPrice: 10 },
      ];
      usePharmacyOrderStore.getState().setMedicines(meds);
      usePharmacyOrderStore.getState().updateMedicineQuantity(999, 1);
      expect(usePharmacyOrderStore.getState().medicines).toEqual(meds);
    });
  });

  describe('pharmacy selection', () => {
    it('selectPharmacy stores the chosen mock pharmacy', () => {
      const pharmacy = MOCK_PHARMACIES[0];
      usePharmacyOrderStore.getState().selectPharmacy(pharmacy);
      expect(usePharmacyOrderStore.getState().selectedPharmacy).toEqual(pharmacy);
    });

    it('selectPharmacy can clear the selection', () => {
      usePharmacyOrderStore.getState().selectPharmacy(MOCK_PHARMACIES[0]);
      usePharmacyOrderStore.getState().selectPharmacy(null);
      expect(usePharmacyOrderStore.getState().selectedPharmacy).toBeNull();
    });
  });

  describe('computeTotal', () => {
    it('returns subtotal + delivery fee for the medicines', () => {
      const meds: PrescriptionMedicine[] = [
        { id: 1, name: 'A', quantity: 2, unitPrice: 50 }, // 100
        { id: 2, name: 'B', quantity: 1, unitPrice: 60 }, // 60
      ];
      const subtotal = 160;
      const total = computeTotal(meds, null);
      // total should be subtotal plus a non-negative delivery fee
      expect(total).toBeGreaterThanOrEqual(subtotal);
      expect(Number.isFinite(total)).toBe(true);
    });

    it('returns a finite, non-negative number for empty medicines', () => {
      const total = computeTotal([], null);
      expect(total).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(total)).toBe(true);
    });
  });
});

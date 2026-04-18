import { MedicineResult, PharmacyOrderStatus } from '../types';

const PRESCRIPTION_FALLBACK_KEYWORDS = [
  'antibiotic',
  'tablet',
  'capsule',
  'injection',
  'syrup',
  'suspension',
  'drops',
];

const CANCELLABLE_STATUSES: PharmacyOrderStatus[] = [
  'PENDING',
  'PRESCRIPTION_REVIEW',
  'CONFIRMED',
  'PACKED',
];

export const requiresPrescriptionForMedicine = (medicine: MedicineResult): boolean => {
  if (typeof medicine.requiresPrescription === 'boolean') {
    return medicine.requiresPrescription;
  }

  const haystack = `${medicine.name} ${medicine.manufacturer ?? ''}`.toLowerCase();
  return PRESCRIPTION_FALLBACK_KEYWORDS.some((keyword) => haystack.includes(keyword));
};

export const canCancelPharmacyOrder = (status: string): boolean => {
  return CANCELLABLE_STATUSES.includes(status as PharmacyOrderStatus);
};
import { MedicineResult, PharmacyOrder, PharmacyOrderStatus } from '../types';

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

export const getPharmacyDisplayPricing = (order: Pick<PharmacyOrder, 'subtotal' | 'deliveryFee' | 'discount' | 'totalAmount'>) => {
  const fallbackDeliveryFee = order.subtotal >= 500 ? 0 : 40;
  const deliveryFee = order.deliveryFee > 0 ? order.deliveryFee : fallbackDeliveryFee;
  const minimumExpectedTotal = Math.max(0, order.subtotal + deliveryFee - order.discount);
  const totalAmount = order.totalAmount >= minimumExpectedTotal
    ? order.totalAmount
    : minimumExpectedTotal;

  return {
    deliveryFee,
    totalAmount,
  };
};
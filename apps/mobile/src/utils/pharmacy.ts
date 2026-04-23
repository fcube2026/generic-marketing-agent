import { MedicineResult, PharmacyOrder, PharmacyOrderStatus } from '../types';

const FREE_DELIVERY_THRESHOLD = 300;
const DELIVERY_FEE_TIERS = [
  { minSubtotal: 100, fee: 10 },
  { minSubtotal: 0, fee: 20 },
] as const;

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

export const calculateDeliveryFee = (subtotal: number): number => {
  if (subtotal >= FREE_DELIVERY_THRESHOLD) {
    return 0;
  }

  const tier = DELIVERY_FEE_TIERS.find(({ minSubtotal }) => subtotal >= minSubtotal);
  return tier?.fee ?? 20;
};

export const getFreeDeliveryThreshold = (): number => FREE_DELIVERY_THRESHOLD;

export const getPharmacyDisplayPricing = (order: Pick<PharmacyOrder, 'subtotal' | 'deliveryFee' | 'discount' | 'totalAmount'>) => {
  const fallbackDeliveryFee = calculateDeliveryFee(order.subtotal);
  const deliveryFee = order.deliveryFee > 0 || fallbackDeliveryFee === 0
    ? order.deliveryFee
    : fallbackDeliveryFee;
  const minimumExpectedTotal = Math.max(0, order.subtotal + deliveryFee - order.discount);
  const totalAmount = order.totalAmount >= minimumExpectedTotal
    ? order.totalAmount
    : minimumExpectedTotal;

  return {
    deliveryFee,
    totalAmount,
  };
};
import { canCancelPharmacyOrder, requiresPrescriptionForMedicine } from '../pharmacy';

describe('pharmacy utils', () => {
  it('uses explicit backend prescription flag when present', () => {
    expect(
      requiresPrescriptionForMedicine({
        id: '1',
        name: 'Vitamin C',
        price: 99,
        requiresPrescription: false,
      }),
    ).toBe(false);
  });

  it('falls back to keyword detection when flag is missing', () => {
    expect(
      requiresPrescriptionForMedicine({
        id: '2',
        name: 'Antibiotic Tablet',
        price: 199,
      }),
    ).toBe(true);
  });

  it('allows cancellation only for supported statuses', () => {
    expect(canCancelPharmacyOrder('PENDING')).toBe(true);
    expect(canCancelPharmacyOrder('PACKED')).toBe(true);
    expect(canCancelPharmacyOrder('DELIVERED')).toBe(false);
  });
});
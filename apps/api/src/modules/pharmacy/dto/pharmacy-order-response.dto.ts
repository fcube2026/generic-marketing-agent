export class PharmacyOrderItemResponseDto {
  id: string;
  medicineName: string;
  medicineCode?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export class PharmacyOrderResponseDto {
  id: string;
  orderNumber: string;
  patientProfileId: string;
  bookingId?: string | null;
  prescriptionId?: string | null;
  pharmacyPartnerId: string;
  partnerOrderId?: string | null;
  status: string;
  deliveryAddressId: string;
  totalAmount: number;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: PharmacyOrderItemResponseDto[];
}

export class PharmacyOrderItemResponseDto {
  id: string;
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export class PharmacyOrderResponseDto {
  id: string;
  patientId: string;
  bookingId?: string | null;
  prescriptionId?: string | null;
  partnerId: string;
  partnerOrderId?: string | null;
  status: string;
  deliveryAddress: string;
  totalAmount: number;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: PharmacyOrderItemResponseDto[];
}

export class PharmacyOrderItemResponseDto {
  id: string;
  medicineName: string;
  medicineCode?: string | null;
  dosage?: string | null;
  instructions?: string | null;
  isSubstitute: boolean;
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
  uploadedPrescriptionId?: string | null;
  pharmacyPartnerId: string;
  partnerCode: string;
  partnerName: string;
  partnerOrderId?: string | null;
  status: string;
  deliveryAddressId: string;
  deliveryAddress: string;
  prescriptionImageUrl?: string | null;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  estimatedDeliveryAt?: Date | null;
  deliveredAt?: Date | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: PharmacyOrderItemResponseDto[];
}

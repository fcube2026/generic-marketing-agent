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
  pharmacyPartnerId: string | null;
  partnerCode: string | null;
  partnerName: string | null;
  partnerOrderId?: string | null;
  status: string;
  paymentStatus: 'UNPAID' | 'PAID';
  deliveryAddressId: string;
  deliveryAddress: string;
  prescriptionImageUrl?: string | null;
  prescriptionUrl?: string | null;
  subtotal: number | null;
  deliveryFee: number | null;
  discount: number;
  totalAmount: number | null;
  estimatedDeliveryAt?: Date | null;
  deliveredAt?: Date | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: PharmacyOrderItemResponseDto[];
}

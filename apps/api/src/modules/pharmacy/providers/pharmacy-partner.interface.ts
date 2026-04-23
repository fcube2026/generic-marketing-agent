export interface AvailabilityResult {
  medicineCode: string;
  pincode: string;
  available: boolean;
  reason?: string;
}

export interface MedicineResult {
  id: string;
  name: string;
  manufacturer?: string;
  price: number;
  unit?: string;
  requiresPrescription?: boolean;
  availability?: AvailabilityResult;
}

export interface OrderItemInput {
  medicineCode: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
}

export interface CreatePartnerOrder {
  patientId: string;
  items: OrderItemInput[];
  deliveryAddress: string;
}

export interface PartnerOrderResult {
  partnerOrderId: string;
  status: string;
  totalAmount: number;
  items: OrderItemInput[];
}

export interface PartnerOrderStatus {
  partnerOrderId: string;
  status: string;
  updatedAt?: string;
}

export interface CancelResponse {
  partnerOrderId: string;
  status: string;
  cancelled: boolean;
}

export interface PharmacyPartnerProvider {
  searchMedicines(query: string): Promise<MedicineResult[]>;
  checkAvailability(
    medicineCode: string,
    pincode: string,
  ): Promise<AvailabilityResult>;
  createOrder(order: CreatePartnerOrder): Promise<PartnerOrderResult>;
  getOrderStatus(partnerOrderId: string): Promise<PartnerOrderStatus>;
  cancelOrder(partnerOrderId: string): Promise<CancelResponse>;
}

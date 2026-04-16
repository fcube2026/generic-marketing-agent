export interface MedicineResult {
  id: string;
  name: string;
  manufacturer?: string;
  price: number;
  unit?: string;
  requiresPrescription?: boolean;
}

export interface OrderItemInput {
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
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

export interface PharmacyPartnerProvider {
  searchMedicines(query: string): Promise<MedicineResult[]>;
  createOrder(
    patientId: string,
    items: OrderItemInput[],
    deliveryAddress: string,
  ): Promise<PartnerOrderResult>;
  getOrderStatus(partnerOrderId: string): Promise<PartnerOrderStatus>;
}

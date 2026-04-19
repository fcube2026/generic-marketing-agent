import { Injectable, Logger } from '@nestjs/common';
import {
  AvailabilityResult,
  CancelResponse,
  CreatePartnerOrder,
  MedicineResult,
  PartnerOrderResult,
  PartnerOrderStatus,
  PharmacyPartnerProvider,
} from './pharmacy-partner.interface';

@Injectable()
export class MockPharmacyProvider implements PharmacyPartnerProvider {
  private readonly logger = new Logger(MockPharmacyProvider.name);

  async searchMedicines(query: string): Promise<MedicineResult[]> {
    this.logger.log(`[mock] Searching medicines for query: "${query}"`);
    return [
      {
        id: 'mock-med-001',
        name: `${query} 500mg`,
        manufacturer: 'Mock Pharma Ltd.',
        price: 10.5,
        unit: 'strip of 10',
        requiresPrescription: false,
      },
      {
        id: 'mock-med-002',
        name: `${query} 250mg`,
        manufacturer: 'Mock Pharma Ltd.',
        price: 6.0,
        unit: 'strip of 10',
        requiresPrescription: false,
      },
    ];
  }

  async checkAvailability(
    medicineCode: string,
    pincode: string,
  ): Promise<AvailabilityResult> {
    this.logger.log(
      `[mock] Checking availability for medicine ${medicineCode} at ${pincode}`,
    );
    return {
      medicineCode,
      pincode,
      available: true,
    };
  }

  async createOrder(order: CreatePartnerOrder): Promise<PartnerOrderResult> {
    this.logger.log(
      `[mock] Creating order for patient ${order.patientId} to address "${order.deliveryAddress}"`,
    );
    const totalAmount = order.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    return {
      partnerOrderId: `MOCK-ORD-${Date.now()}`,
      status: 'PENDING',
      totalAmount,
      items: order.items,
    };
  }

  async getOrderStatus(partnerOrderId: string): Promise<PartnerOrderStatus> {
    this.logger.log(`[mock] Getting status for order ${partnerOrderId}`);
    return {
      partnerOrderId,
      status: 'CONFIRMED',
      updatedAt: new Date().toISOString(),
    };
  }

  async cancelOrder(partnerOrderId: string): Promise<CancelResponse> {
    this.logger.log(`[mock] Cancelling order ${partnerOrderId}`);
    return {
      partnerOrderId,
      status: 'CANCELLED',
      cancelled: true,
    };
  }
}

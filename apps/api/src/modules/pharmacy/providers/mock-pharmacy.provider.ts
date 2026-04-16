import { Injectable, Logger } from '@nestjs/common';
import {
  MedicineResult,
  OrderItemInput,
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

  async createOrder(
    patientId: string,
    items: OrderItemInput[],
    deliveryAddress: string,
  ): Promise<PartnerOrderResult> {
    this.logger.log(
      `[mock] Creating order for patient ${patientId} to address "${deliveryAddress}"`,
    );
    const totalAmount = items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    return {
      partnerOrderId: `MOCK-ORD-${Date.now()}`,
      status: 'PLACED',
      totalAmount,
      items,
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
}

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
import { PharmacyPartnersService } from '../../pharmacy-partners/pharmacy-partners.service';

interface LocalOrder {
  partnerOrderId: string;
  status: string;
  totalAmount: number;
  pharmacyName: string;
  updatedAt: string;
}

/**
 * LocalPharmacyProvider
 *
 * An additional pharmacy strategy that sources medicines from local pharmacies
 * registered via the onboarding portal (LocalPharmacy + LocalPharmacyInventory).
 *
 * Only ACTIVE pharmacies are queried. If no active local pharmacies exist the
 * system behaves exactly as before — the existing MockPharmacyProvider is
 * unaffected and continues to work independently.
 */
@Injectable()
export class LocalPharmacyProvider implements PharmacyPartnerProvider {
  private readonly logger = new Logger(LocalPharmacyProvider.name);
  private readonly orderStore = new Map<string, LocalOrder>();

  constructor(
    private readonly pharmacyPartnersService: PharmacyPartnersService,
  ) {}

  async searchMedicines(query: string): Promise<MedicineResult[]> {
    this.logger.log(`[local] searchMedicines query="${query}"`);

    const pharmacies =
      await this.pharmacyPartnersService.findActiveWithInventory();

    if (pharmacies.length === 0) {
      this.logger.log('[local] No active local pharmacies — returning empty');
      return [];
    }

    const lower = query.toLowerCase().trim();
    const seen = new Map<string, MedicineResult>();

    for (const pharmacy of pharmacies) {
      for (const item of pharmacy.inventory) {
        if (item.stock <= 0) continue;
        if (
          lower.length > 0 &&
          !item.medicineName.toLowerCase().startsWith(lower)
        ) {
          continue;
        }

        // Use a composite key so the same medicine from different pharmacies
        // appears as separate results (allowing price comparison).
        const key = `${item.pharmacyId}-${item.medicineName.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.set(key, {
            id: item.id,
            name: item.medicineName,
            manufacturer: pharmacy.name,
            price: item.price,
            unit: 'unit',
            requiresPrescription: false,
          });
        }
      }
    }

    const results = Array.from(seen.values()).slice(0, 20);
    this.logger.log(
      `[local] searchMedicines returned ${results.length} result(s)`,
    );
    return results;
  }

  async checkAvailability(
    medicineCode: string,
    pincode: string,
  ): Promise<AvailabilityResult> {
    this.logger.log(
      `[local] checkAvailability medicineCode="${medicineCode}" pincode="${pincode}"`,
    );

    const pharmacies =
      await this.pharmacyPartnersService.findActiveWithInventory();

    const available = pharmacies.some((pharmacy) =>
      pharmacy.inventory.some(
        (item) => item.id === medicineCode && item.stock > 0,
      ),
    );

    return {
      medicineCode,
      pincode,
      available,
      reason: available ? undefined : 'Not available at any local pharmacy',
    };
  }

  async createOrder(order: CreatePartnerOrder): Promise<PartnerOrderResult> {
    this.logger.log(
      `[local] createOrder patientId="${order.patientId}" items=${order.items.length}`,
    );

    const pharmacies =
      await this.pharmacyPartnersService.findActiveWithInventory();

    if (pharmacies.length === 0) {
      this.logger.warn(
        '[local] createOrder — no active local pharmacies available',
      );
      // No active pharmacies; the system should fall back to the mock provider.
      // Throw so PharmacyOrderService can handle the failure gracefully.
      throw new Error(
        'No active local pharmacies available to fulfil this order',
      );
    }

    // Pick the first active pharmacy as the fulfilling pharmacy (mock routing)
    const fulfillingPharmacy = pharmacies[0];
    const pharmacyName = fulfillingPharmacy.name;

    const partnerOrderId = `LOCAL-ORD-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
    const totalAmount = order.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    const now = new Date().toISOString();

    this.orderStore.set(partnerOrderId, {
      partnerOrderId,
      status: 'PLACED',
      totalAmount,
      pharmacyName,
      updatedAt: now,
    });

    // Mock order notification — log to console (no real SMS/email)
    this.logger.log(
      `[notification] Order sent to ${pharmacyName} | orderId=${partnerOrderId} | total=₹${totalAmount}`,
    );

    return {
      partnerOrderId,
      status: 'PLACED',
      totalAmount,
      items: order.items,
    };
  }

  async getOrderStatus(partnerOrderId: string): Promise<PartnerOrderStatus> {
    const order = this.orderStore.get(partnerOrderId);
    return {
      partnerOrderId,
      status: order?.status ?? 'PLACED',
      updatedAt: order?.updatedAt ?? new Date().toISOString(),
    };
  }

  async cancelOrder(partnerOrderId: string): Promise<CancelResponse> {
    const order = this.orderStore.get(partnerOrderId);
    if (order) {
      order.status = 'CANCELLED';
      order.updatedAt = new Date().toISOString();
    }

    this.logger.log(`[local] cancelOrder partnerOrderId="${partnerOrderId}"`);

    return {
      partnerOrderId,
      status: 'CANCELLED',
      cancelled: true,
    };
  }
}

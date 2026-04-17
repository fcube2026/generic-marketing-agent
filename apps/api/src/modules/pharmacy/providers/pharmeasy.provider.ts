import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AvailabilityResult,
  CancelResponse,
  CreatePartnerOrder,
  MedicineResult,
  PartnerOrderResult,
  PartnerOrderStatus,
  PharmacyPartnerProvider,
} from './pharmacy-partner.interface';

/**
 * PharmEasy partner integration.
 *
 * Required env vars (only for live mode):
 *   PHARMEASY_API_URL  — base URL for the PharmEasy partner API
 *   PHARMEASY_API_KEY  — API key for authentication
 *
 * When PHARMEASY_API_URL is not set the provider falls back to mock responses
 * so the module is safe to use in development without live credentials.
 */
@Injectable()
export class PharmEasyProvider implements PharmacyPartnerProvider {
  private readonly logger = new Logger(PharmEasyProvider.name);
  private readonly apiUrl: string | undefined;
  private readonly apiKey: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.apiUrl = config.get<string>('PHARMEASY_API_URL');
    this.apiKey = config.get<string>('PHARMEASY_API_KEY');
  }

  async searchMedicines(query: string): Promise<MedicineResult[]> {
    if (!this.apiUrl || !this.apiKey) {
      this.logger.warn(
        '[pharmeasy] PHARMEASY_API_URL or PHARMEASY_API_KEY not set — returning empty results',
      );
      return [];
    }

    const url = `${this.apiUrl}/medicines/search?q=${encodeURIComponent(query)}`;
    const data = await this.get<{ medicines?: PharmEasyMedicine[] }>(
      url,
      this.apiKey,
    );
    return (data.medicines ?? []).map(this.normalizeMedicine);
  }

  async checkAvailability(
    medicineCode: string,
    pincode: string,
  ): Promise<AvailabilityResult> {
    if (!this.apiUrl || !this.apiKey) {
      this.logger.warn(
        '[pharmeasy] PHARMEASY_API_URL or PHARMEASY_API_KEY not set — marking medicine unavailable',
      );
      return {
        medicineCode,
        pincode,
        available: false,
        reason: 'PharmEasy credentials are not configured',
      };
    }

    const data = await this.get<{ available: boolean; reason?: string }>(
      `${this.apiUrl}/medicines/${encodeURIComponent(medicineCode)}/availability?pincode=${encodeURIComponent(pincode)}`,
      this.apiKey,
    );

    return {
      medicineCode,
      pincode,
      available: data.available,
      reason: data.reason,
    };
  }

  async createOrder(order: CreatePartnerOrder): Promise<PartnerOrderResult> {
    if (!this.apiUrl || !this.apiKey) {
      throw new Error(
        'PHARMEASY_API_URL and PHARMEASY_API_KEY must be set to place live orders',
      );
    }

    const payload = {
      patient_id: order.patientId,
      delivery_address: order.deliveryAddress,
      items: order.items.map((i) => ({
        medicine_id: i.medicineCode,
        medicine_name: i.medicineName,
        quantity: i.quantity,
        unit_price: i.unitPrice,
      })),
    };

    const data = await this.post<PharmEasyOrderResponse>(
      `${this.apiUrl}/orders`,
      payload,
      this.apiKey,
    );

    return {
      partnerOrderId: data.order_id,
      status: data.status,
      totalAmount: data.total_amount,
      items: order.items,
    };
  }

  async getOrderStatus(partnerOrderId: string): Promise<PartnerOrderStatus> {
    if (!this.apiUrl || !this.apiKey) {
      throw new Error(
        'PHARMEASY_API_URL and PHARMEASY_API_KEY must be set to fetch live order status',
      );
    }

    const data = await this.get<PharmEasyStatusResponse>(
      `${this.apiUrl}/orders/${partnerOrderId}`,
      this.apiKey,
    );

    return {
      partnerOrderId,
      status: data.status,
      updatedAt: data.updated_at,
    };
  }

  async cancelOrder(partnerOrderId: string): Promise<CancelResponse> {
    if (!this.apiUrl || !this.apiKey) {
      throw new Error(
        'PHARMEASY_API_URL and PHARMEASY_API_KEY must be set to cancel live orders',
      );
    }

    const data = await this.post<PharmEasyCancelResponse>(
      `${this.apiUrl}/orders/${partnerOrderId}/cancel`,
      {},
      this.apiKey,
    );

    return {
      partnerOrderId,
      status: data.status,
      cancelled: data.cancelled,
    };
  }

  private async get<T>(url: string, apiKey: string): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: this.authHeaders(apiKey),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
    return this.handleResponse<T>(response);
  }

  private async post<T>(
    url: string,
    body: unknown,
    apiKey: string,
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders(apiKey),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
    return this.handleResponse<T>(response);
  }

  private authHeaders(apiKey: string): Record<string, string> {
    return { 'X-Api-Key': apiKey };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    let data: T;
    try {
      data = (await response.json()) as T;
    } catch {
      throw new Error(
        `PharmEasy API returned HTTP ${response.status} with non-JSON body`,
      );
    }
    if (!response.ok) {
      this.logger.warn(
        `[pharmeasy] API error ${response.status}: ${JSON.stringify(data)}`,
      );
      throw new Error(`PharmEasy API returned HTTP ${response.status}`);
    }
    return data;
  }

  private normalizeMedicine(raw: PharmEasyMedicine): MedicineResult {
    return {
      id: String(raw.id),
      name: raw.name,
      manufacturer: raw.manufacturer,
      price: raw.mrp ?? raw.price,
      unit: raw.packing,
      requiresPrescription: raw.requires_prescription ?? false,
    };
  }
}

// ---------------------------------------------------------------------------
// Private response shapes for PharmEasy API (internal to this provider)
// ---------------------------------------------------------------------------

interface PharmEasyMedicine {
  id: string | number;
  name: string;
  manufacturer?: string;
  mrp?: number;
  price: number;
  packing?: string;
  requires_prescription?: boolean;
}

interface PharmEasyOrderResponse {
  order_id: string;
  status: string;
  total_amount: number;
}

interface PharmEasyStatusResponse {
  status: string;
  updated_at?: string;
}

interface PharmEasyCancelResponse {
  status: string;
  cancelled: boolean;
}

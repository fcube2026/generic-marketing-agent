import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AadhaarValidationResult {
  valid: boolean;
  aadhaarNumber?: string;
  /** Customer details returned by the external Aadhaar API (Surepass etc.) */
  customerName?: string;
  customerDob?: string;
  customerGender?: string;
  customerAddress?: string;
  rawResponse?: Record<string, unknown>;
}

/**
 * Aadhaar number validation provider.
 *
 * Verifies the authenticity and accuracy of an Aadhaar number against
 * official UIDAI records via a third-party API (Surepass).
 *
 * Configure via:
 *   AADHAAR_API_PROVIDER — mock | surepass (default: mock)
 *   AADHAAR_API_URL      — full endpoint URL for the chosen provider
 *   AADHAAR_API_KEY      — API key / secret for authentication
 */
@Injectable()
export class AadhaarValidationProvider {
  private readonly logger = new Logger(AadhaarValidationProvider.name);
  private readonly provider: string;
  private readonly apiUrl: string | undefined;
  private readonly apiKey: string | undefined;

  constructor(private config: ConfigService) {
    this.provider = config.get<string>('AADHAAR_API_PROVIDER', 'mock');
    this.apiUrl = config.get<string>('AADHAAR_API_URL');
    this.apiKey = config.get<string>('AADHAAR_API_KEY');
  }

  async validate(aadhaarNumber: string): Promise<AadhaarValidationResult> {
    if (this.provider === 'mock') {
      return this.mockValidate(aadhaarNumber);
    }
    return this.callExternalApi(aadhaarNumber);
  }

  private mockValidate(aadhaarNumber: string): AadhaarValidationResult {
    const valid = /^\d{12}$/.test(aadhaarNumber);
    const masked = valid
      ? `${aadhaarNumber.slice(0, 4)}XXXX${aadhaarNumber.slice(-4)}`
      : '****XXXX****';
    this.logger.log(`[aadhaar-mock] Validating Aadhaar: ${masked}`);
    return {
      valid,
      aadhaarNumber: valid ? aadhaarNumber : undefined,
      rawResponse: { source: 'mock', valid },
    };
  }

  private async callExternalApi(
    aadhaarNumber: string,
  ): Promise<AadhaarValidationResult> {
    if (!this.apiUrl || !this.apiKey) {
      throw new Error(
        'AADHAAR_API_URL and AADHAAR_API_KEY must be set for live Aadhaar validation',
      );
    }

    const masked = /^\d{12}$/.test(aadhaarNumber)
      ? `${aadhaarNumber.slice(0, 4)}XXXX${aadhaarNumber.slice(-4)}`
      : '****XXXX****';
    this.logger.log(`[aadhaar] Validating Aadhaar: ${masked}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    let response: Response;
    try {
      response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ id_number: aadhaarNumber }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      this.logger.warn(
        `[aadhaar] Validation error ${response.status}: ${JSON.stringify(data)}`,
      );
      throw new Error(`Aadhaar API returned HTTP ${response.status}`);
    }

    const payload = (data.data ?? data) as Record<string, unknown>;
    const valid =
      (data.status as string) === 'SUCCESS' ||
      payload.is_valid === true ||
      payload.valid === true;

    // Extract customer details when present
    const customerName =
      (payload.full_name as string) ?? (payload.name as string) ?? undefined;
    const customerDob =
      (payload.dob as string) ?? (payload.date_of_birth as string) ?? undefined;
    const customerGender = (payload.gender as string) ?? undefined;
    const customerAddress =
      (payload.address as string) ??
      (payload.split_address as string) ??
      undefined;

    return {
      valid,
      aadhaarNumber,
      customerName,
      customerDob,
      customerGender,
      customerAddress,
      rawResponse: data,
    };
  }
}

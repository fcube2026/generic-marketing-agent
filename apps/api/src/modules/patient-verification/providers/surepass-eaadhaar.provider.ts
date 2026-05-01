import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SurepassEaadhaarResult {
  valid: boolean;
  /** Full name as extracted from the eAadhaar */
  name?: string;
  /** Date of birth — Surepass returns DD-MM-YYYY */
  dob?: string;
  /** 'M' or 'F' */
  gender?: string;
  /** Combined address string */
  address?: string;
  /** City / district */
  district?: string;
  /** State */
  state?: string;
  /** Postal code */
  zip?: string;
  /** Masked Aadhaar number (e.g. "XXXX XXXX 1234") */
  aadhaarNumber?: string;
  /** Last 4 digits only */
  aadhaarLast4?: string;
  /** Raw response payload from Surepass for audit storage */
  rawResponse?: Record<string, unknown>;
}

/**
 * Surepass eAadhaar PDF upload provider.
 *
 * Validates an eAadhaar PDF via the Surepass API:
 *   POST /api/v1/aadhaar/upload/eaadhaar
 *
 * Environment variables:
 *   SUREPASS_EAADHAAR_ENABLED — 'true' to use live API (default: false → mock)
 *   SUREPASS_API_URL          — base URL (e.g. https://kyc-api.surepass.io)
 *   SUREPASS_API_TOKEN        — Bearer JWT token
 */
@Injectable()
export class SurepassEaadhaarProvider {
  private readonly logger = new Logger(SurepassEaadhaarProvider.name);
  private readonly enabled: boolean;
  private readonly apiUrl: string;
  private readonly apiToken: string;

  constructor(private readonly config: ConfigService) {
    const flag = (
      config.get<string>('SUREPASS_EAADHAAR_ENABLED', 'false') || 'false'
    ).toLowerCase();
    this.apiUrl = (
      config.get<string>('SUREPASS_API_URL', 'https://sandbox.surepass.io') ||
      'https://sandbox.surepass.io'
    ).replace(/\/+$/, '');
    this.apiToken = config.get<string>('SUREPASS_API_TOKEN', '') || '';
    this.enabled = flag === 'true' && !!this.apiToken;

    if (!this.enabled) {
      this.logger.log(
        `SurepassEaadhaarProvider disabled (SUREPASS_EAADHAAR_ENABLED=${flag}, token=${
          this.apiToken ? 'set' : 'unset'
        }) — using mock`,
      );
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Upload an eAadhaar PDF buffer to Surepass and extract personal details.
   *
   * @param pdfBuffer   Raw bytes of the eAadhaar PDF
   * @param password    Optional PDF password (Aadhaar PDFs are typically
   *                    protected with a 6-digit pincode or a date-of-birth
   *                    string — whatever the patient chose when downloading
   *                    from myAadhaar.uidai.gov.in)
   */
  async processEaadhaar(
    pdfBuffer: Buffer,
    password?: string,
  ): Promise<SurepassEaadhaarResult> {
    if (!this.enabled) {
      return this.mockProcess();
    }
    return this.callSurepass(pdfBuffer, password);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // internals
  // ─────────────────────────────────────────────────────────────────────────────

  private mockProcess(): SurepassEaadhaarResult {
    this.logger.log('[surepass-eaadhaar-mock] Returning stub extraction');
    return {
      valid: true,
      name: 'Mock Patient',
      dob: '01-01-1990',
      gender: 'M',
      address: '123 Mock Street, Mock Colony',
      district: 'Mock District',
      state: 'Maharashtra',
      zip: '400001',
      aadhaarNumber: 'XXXX XXXX 0000',
      aadhaarLast4: '0000',
      rawResponse: { source: 'mock', valid: true },
    };
  }

  private async callSurepass(
    pdfBuffer: Buffer,
    password?: string,
  ): Promise<SurepassEaadhaarResult> {
    const endpoint = `${this.apiUrl}/api/v1/aadhaar/upload/eaadhaar`;

    const form = new FormData();
    const blob = new Blob([new Uint8Array(pdfBuffer)], {
      type: 'application/pdf',
    });
    form.append('file', blob, 'eaadhaar.pdf');
    if (password) {
      form.append('password', password);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
        },
        body: form,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const bodyText = await response.text();
    const truncated =
      bodyText.length > 500 ? `${bodyText.slice(0, 500)}…` : bodyText;

    if (!response.ok) {
      this.logger.warn(
        `[surepass-eaadhaar] API error ${response.status}: ${truncated}`,
      );
      return {
        valid: false,
        rawResponse: { httpStatus: response.status, body: truncated },
      };
    }

    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(bodyText) as Record<string, unknown>;
    } catch {
      this.logger.warn(
        `[surepass-eaadhaar] API returned non-JSON body: ${truncated}`,
      );
      return { valid: false, rawResponse: { body: truncated } };
    }

    return this.parseResponse(raw);
  }

  private parseResponse(raw: Record<string, unknown>): SurepassEaadhaarResult {
    const statusCode = raw['status_code'] as number | undefined;
    const message = (raw['message'] as string | undefined) ?? '';
    const valid =
      statusCode === 200 ||
      message.toLowerCase().includes('success') ||
      message.toLowerCase().includes('fetched');

    const data = (raw['data'] ?? {}) as Record<string, unknown>;

    const toStr = (v: unknown): string | undefined =>
      v != null && typeof v !== 'object'
        ? String(v).trim() || undefined
        : undefined;

    const name = toStr(data['name']) ?? toStr(data['full_name']);
    const dob = toStr(data['dob']) ?? toStr(data['date_of_birth']);
    const gender = toStr(data['gender']);
    const address =
      toStr(data['address']) ??
      toStr(data['split_address']) ??
      toStr(data['full_address']);
    const district = toStr(data['district']) ?? toStr(data['city']);
    const state = toStr(data['state']);
    const zip = toStr(data['zip']) ?? toStr(data['pincode']);
    const aadhaarNumber = toStr(data['aadhaar_number']);

    // Extract last-4 from the masked number, e.g. "XXXX XXXX 1234" → "1234"
    let aadhaarLast4: string | undefined;
    if (aadhaarNumber) {
      const parts = aadhaarNumber.replace(/\s+/g, ' ').trim().split(' ');
      const last = parts[parts.length - 1];
      if (last && /^\d{4}$/.test(last)) {
        aadhaarLast4 = last;
      }
    }

    this.logger.log(
      `[surepass-eaadhaar] Parsed: valid=${valid}, name=${name ? '✓' : '—'}, dob=${dob ? '✓' : '—'}, last4=${aadhaarLast4 ?? '—'}`,
    );

    return {
      valid,
      name,
      dob,
      gender,
      address,
      district,
      state,
      zip,
      aadhaarNumber,
      aadhaarLast4,
      rawResponse: raw,
    };
  }
}

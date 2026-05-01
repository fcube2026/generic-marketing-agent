import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SurepassAadhaarValidationResult {
  valid: boolean;
  /** Age range string, e.g. "20-30" */
  ageRange?: string;
  /** State of residence from UIDAI records */
  state?: string;
  /** 'M' or 'F' */
  gender?: string;
  /** Last 4 digits of the Aadhaar number */
  lastDigits?: string;
  /** Whether a mobile number is registered with this Aadhaar */
  isMobile?: boolean;
  /** Raw response payload (aadhaar_number field stripped for privacy) */
  rawResponse?: Record<string, unknown>;
}

/**
 * Surepass Aadhaar number validation provider.
 *
 * Validates an Aadhaar number via the Surepass API:
 *   POST /api/v1/aadhaar-validation/aadhaar-validation
 *
 * Environment variables:
 *   SUREPASS_AADHAAR_VALIDATION_ENABLED — 'true' to use live API (default: false → mock)
 *   SUREPASS_API_URL                    — base URL (e.g. https://sandbox.surepass.io)
 *   SUREPASS_API_TOKEN                  — Bearer JWT token
 */
@Injectable()
export class SurepassAadhaarValidationProvider {
  private readonly logger = new Logger(SurepassAadhaarValidationProvider.name);
  private readonly enabled: boolean;
  private readonly apiUrl: string;
  private readonly apiToken: string;

  constructor(private readonly config: ConfigService) {
    const flag = (
      config.get<string>('SUREPASS_AADHAAR_VALIDATION_ENABLED', 'false') ||
      'false'
    ).toLowerCase();
    this.apiUrl = (
      config.get<string>('SUREPASS_API_URL', 'https://sandbox.surepass.io') ||
      'https://sandbox.surepass.io'
    ).replace(/\/+$/, '');
    this.apiToken = config.get<string>('SUREPASS_API_TOKEN', '') || '';
    this.enabled = flag === 'true' && !!this.apiToken;

    if (!this.enabled) {
      this.logger.log(
        `SurepassAadhaarValidationProvider disabled (SUREPASS_AADHAAR_VALIDATION_ENABLED=${flag}, token=${
          this.apiToken ? 'set' : 'unset'
        }) — using mock`,
      );
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async validateAadhaar(
    aadhaarNumber: string,
  ): Promise<SurepassAadhaarValidationResult> {
    if (!this.enabled) {
      return this.mockValidate(aadhaarNumber);
    }
    return this.callSurepass(aadhaarNumber);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // internals
  // ─────────────────────────────────────────────────────────────────────────────

  private mockValidate(aadhaarNumber: string): SurepassAadhaarValidationResult {
    this.logger.log('[surepass-aadhaar-validation-mock] Returning stub result');
    const lastDigits = aadhaarNumber.slice(-4);
    return {
      valid: true,
      ageRange: '20-30',
      state: 'Maharashtra',
      gender: 'M',
      lastDigits,
      isMobile: true,
      rawResponse: { source: 'mock', valid: true },
    };
  }

  private async callSurepass(
    aadhaarNumber: string,
  ): Promise<SurepassAadhaarValidationResult> {
    const endpoint = `${this.apiUrl}/api/v1/aadhaar-validation/aadhaar-validation`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiToken}`,
        },
        body: JSON.stringify({ id_number: aadhaarNumber }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const raw = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      this.logger.warn(
        `[surepass-aadhaar-validation] API error ${response.status}: ${JSON.stringify(raw)}`,
      );
      return { valid: false, rawResponse: this.redactRaw(raw) };
    }

    return this.parseResponse(raw);
  }

  private parseResponse(
    raw: Record<string, unknown>,
  ): SurepassAadhaarValidationResult {
    const statusCode = raw['status_code'] as number | undefined;
    const success = raw['success'] as boolean | undefined;
    const valid =
      statusCode === 200 ||
      success === true ||
      (raw['message_code'] as string | undefined) === 'success';

    const data = (raw['data'] ?? {}) as Record<string, unknown>;

    const toStr = (v: unknown): string | undefined =>
      v != null && typeof v !== 'object'
        ? String(v).trim() || undefined
        : undefined;

    const ageRange = toStr(data['age_range']);
    const state = toStr(data['state']);
    const gender = toStr(data['gender']);
    const lastDigits = toStr(data['last_digits']);
    const isMobile =
      typeof data['is_mobile'] === 'boolean' ? data['is_mobile'] : undefined;

    this.logger.log(
      `[surepass-aadhaar-validation] Parsed: valid=${valid}, state=${state ?? '—'}, gender=${gender ?? '—'}, last4=${lastDigits ?? '—'}`,
    );

    return {
      valid,
      ageRange,
      state,
      gender,
      lastDigits,
      isMobile,
      rawResponse: this.redactRaw(raw),
    };
  }

  /**
   * Strip the full Aadhaar number from the raw response before storing.
   * We only ever persist the last 4 digits.
   */
  private redactRaw(raw: Record<string, unknown>): Record<string, unknown> {
    const data = raw['data'] as Record<string, unknown> | undefined;
    if (!data) return raw;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { aadhaar_number: _redacted, ...safeData } = data;
    return { ...raw, data: safeData };
  }
}

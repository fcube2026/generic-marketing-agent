import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
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
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      this.logger.error(
        `[surepass-aadhaar-validation] Network error calling Surepass (timeout=${isAbort}): ${String(err)}`,
      );
      throw new ServiceUnavailableException(
        'Aadhaar validation service is temporarily unavailable. Please try again later.',
      );
    } finally {
      clearTimeout(timeoutId);
    }

    const bodyText = await response.text();
    const truncated =
      bodyText.length > 500 ? `${bodyText.slice(0, 500)}…` : bodyText;

    if (!response.ok) {
      this.logger.warn(
        `[surepass-aadhaar-validation] API error ${response.status}: ${truncated}`,
      );
      // 422 means the Aadhaar number itself failed validation (not found in
      // UIDAI records, invalid checksum, etc.) — treat as invalid aadhaar.
      // Any other non-200 status (401, 403, 429, 5xx) is a service/auth
      // error and should not be surfaced as "the Aadhaar number is wrong".
      if (response.status === 422) {
        return {
          valid: false,
          rawResponse: { httpStatus: response.status, body: truncated },
        };
      }
      throw new ServiceUnavailableException(
        'Aadhaar validation service is temporarily unavailable. Please try again later.',
      );
    }

    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(bodyText) as Record<string, unknown>;
    } catch {
      this.logger.warn(
        `[surepass-aadhaar-validation] API returned non-JSON body: ${truncated}`,
      );
      throw new ServiceUnavailableException(
        'Aadhaar validation service returned an unexpected response. Please try again later.',
      );
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

    // A status_code >= 500 in the body means a Surepass server-side fault even
    // when the HTTP response is 200. Surface it as a service error so the user
    // gets a "try again later" message rather than "invalid Aadhaar".
    if (!valid && statusCode !== undefined && statusCode >= 500) {
      this.logger.error(
        `[surepass-aadhaar-validation] Surepass server error in body: status_code=${statusCode}`,
      );
      throw new ServiceUnavailableException(
        'Aadhaar validation service is temporarily unavailable. Please try again later.',
      );
    }

    const data = (raw['data'] ?? {}) as Record<string, unknown>;

    const toStr = (v: unknown): string | undefined =>
      v != null && typeof v !== 'object'
        ? String(v).trim() || undefined
        : undefined;

    const ageRange = toStr(data['age_range']);
    const state = toStr(data['state']);
    const gender = toStr(data['gender']);
    const isMobile =
      typeof data['is_mobile'] === 'boolean' ? data['is_mobile'] : undefined;

    // Extract the last 4 digits of the Aadhaar from the masked `aadhaar_number`
    // field (e.g. "XXXXXXXX2132") rather than `last_digits` which is the last 3
    // digits of the mobile number registered with UIDAI.
    const maskedAadhaar = toStr(data['aadhaar_number']);
    const lastDigits = maskedAadhaar
      ? maskedAadhaar.replace(/\s/g, '').slice(-4)
      : undefined;

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

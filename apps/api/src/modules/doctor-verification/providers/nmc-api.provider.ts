import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface NmcVerificationRequest {
  memberId: string;
  stateCouncil: string;
  yearOfAdmission: string;
}

export interface NmcVerificationResult {
  found: boolean;
  registrationNumber?: string;
  name?: string;
  qualifications?: string[];
  stateCouncil?: string;
  registrationDate?: string;
  registrationStatus?: string;
  rawResponse?: Record<string, unknown>;
}

/**
 * Pluggable adapter for third-party NMC verification APIs.
 *
 * Supported providers (configured via NMC_API_PROVIDER env var):
 *   - "surepass"  → surepass.io NMC verification API
 *   - "decentro"  → decentro.tech professional verification API
 *   - "idfy"      → IDfy MCI/NMC doctor verification API
 *   - "mock"      → always returns a successful mock result (default; safe for development)
 *
 * Required env vars for live providers:
 *   NMC_API_PROVIDER — one of the values above
 *   NMC_API_URL      — full endpoint URL for the chosen provider
 *   NMC_API_KEY      — API key / secret for authentication
 */
@Injectable()
export class NmcApiProvider {
  private readonly logger = new Logger(NmcApiProvider.name);
  private readonly provider: string;
  private readonly apiUrl: string | undefined;
  private readonly apiKey: string | undefined;

  constructor(private config: ConfigService) {
    this.provider = config.get<string>('NMC_API_PROVIDER', 'mock');
    this.apiUrl = config.get<string>('NMC_API_URL');
    this.apiKey = config.get<string>('NMC_API_KEY');
  }

  async verify(req: NmcVerificationRequest): Promise<NmcVerificationResult> {
    if (this.provider === 'mock') {
      return this.mockVerify(req);
    }
    return this.callExternalApi(req);
  }

  private mockVerify(req: NmcVerificationRequest): NmcVerificationResult {
    this.logger.log(
      `[mock] Verifying NMC registration: ${req.memberId} / ${req.stateCouncil}`,
    );
    // Do not return a name from mock — the service treats a missing name as a
    // confirmed match, avoiding spurious DATA_MISMATCH (issue code 400) when
    // any real name is submitted against this mock.
    return {
      found: true,
      registrationNumber: req.memberId,
      qualifications: ['MBBS'],
      stateCouncil: req.stateCouncil,
      registrationDate: `${req.yearOfAdmission}-01-01`,
      registrationStatus: 'ACTIVE',
      rawResponse: { source: 'mock' },
    };
  }

  private async callExternalApi(
    req: NmcVerificationRequest,
  ): Promise<NmcVerificationResult> {
    if (!this.apiUrl || !this.apiKey) {
      throw new Error(
        'NMC_API_URL and NMC_API_KEY must be set for live verification',
      );
    }

    const payload = this.buildPayload(req);

    this.logger.log(
      `[${this.provider}] Verifying NMC registration: ${req.memberId}`,
    );

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
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      this.logger.warn(
        `[${this.provider}] Verification API error ${response.status}: ${JSON.stringify(data)}`,
      );
      throw new Error(
        `NMC API (${this.provider}) returned HTTP ${response.status}`,
      );
    }

    return this.normalizeResponse(data, req);
  }

  /** Build the request payload in the format expected by each provider. */
  private buildPayload(req: NmcVerificationRequest): Record<string, unknown> {
    switch (this.provider) {
      case 'surepass':
        // Surepass doctor-verification API uses id_number for the NMC registration
        // number. consent must be the string "Y". state_council and
        // year_of_admission are optional — Surepass resolves them internally.
        return {
          reference_id: `curex24-${Date.now()}`,
          consent: 'Y',
          id_number: req.memberId,
          ...(req.stateCouncil ? { state_council: req.stateCouncil } : {}),
          ...(req.yearOfAdmission
            ? { year_of_admission: req.yearOfAdmission }
            : {}),
        };
      case 'decentro':
        return {
          reference_id: `curex24-${Date.now()}`,
          consent: true,
          purpose:
            'Doctor onboarding verification for Curex24 healthcare platform',
          member_id: req.memberId,
          state_council: req.stateCouncil,
          year_of_admission: req.yearOfAdmission,
        };
      case 'idfy':
        return {
          registration_number: req.memberId,
          council_name: req.stateCouncil,
          year_of_registration: req.yearOfAdmission,
        };
      default:
        return {
          member_id: req.memberId,
          state_council: req.stateCouncil,
          year_of_admission: req.yearOfAdmission,
        };
    }
  }

  /** Normalize provider-specific response shapes into a common result. */
  private normalizeResponse(
    data: Record<string, unknown>,
    req: NmcVerificationRequest,
  ): NmcVerificationResult {
    switch (this.provider) {
      case 'surepass': {
        // Surepass response shape:
        // { success: true, status_code: 200, data: { results: [{ full_name, registration_number, ... }] } }
        const payload = (data.data ?? {}) as Record<string, unknown>;
        const results = Array.isArray(payload.results) ? payload.results : [];
        const first = (results[0] ?? {}) as Record<string, unknown>;
        const found = data.success === true && results.length > 0;
        return {
          found,
          registrationNumber: first.registration_number as string | undefined,
          name: first.full_name as string | undefined,
          qualifications: first.qualification
            ? [first.qualification as string]
            : [],
          stateCouncil: first.state_medical_council as string | undefined,
          registrationDate: first.registration_date as string | undefined,
          registrationStatus: first.registration_status as string | undefined,
          rawResponse: data,
        };
      }
      case 'decentro': {
        const payload = (data.data ?? data) as Record<string, unknown>;
        const found =
          (data.status as string) === 'SUCCESS' &&
          !!payload.registration_number;
        return {
          found,
          registrationNumber: payload.registration_number as string | undefined,
          name: payload.name as string | undefined,
          qualifications: payload.qualification
            ? [payload.qualification as string]
            : [],
          stateCouncil: payload.state_medical_council as string | undefined,
          registrationDate: payload.registration_date as string | undefined,
          registrationStatus: payload.registration_status as string | undefined,
          rawResponse: data,
        };
      }
      case 'idfy': {
        const result = (data.result ?? data) as Record<string, unknown>;
        const found =
          (result.status as string) === 'id_found' ||
          !!(result.registration_number ?? result.member_id);
        return {
          found,
          registrationNumber:
            (result.registration_number as string | undefined) ?? req.memberId,
          name: result.full_name as string | undefined,
          qualifications: result.education ? [result.education as string] : [],
          stateCouncil: result.council_name as string | undefined,
          registrationDate: result.registration_date as string | undefined,
          registrationStatus: result.status as string | undefined,
          rawResponse: data,
        };
      }
      default:
        return { found: false, rawResponse: data };
    }
  }
}

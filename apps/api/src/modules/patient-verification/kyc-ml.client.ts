import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

/**
 * Structured response from the Python kyc-ml sidecar's `/process-aadhaar`.
 * Mirrors the Pydantic `AadhaarExtraction` schema.
 */
export interface KycMlAadhaarExtraction {
  full_name: string | null;
  dob: string | null;
  gender: string | null;
  address: string | null;
  aadhaar_last4: string | null;
  face_stored: boolean;
  storage_path: string | null;
}

export interface KycMlFaceMatch {
  matched: boolean;
  distance: number;
  similarity: number;
  threshold: number;
  cleaned_up: boolean;
}

/**
 * Structured error raised when the Python sidecar returns a 4xx with a
 * `{ code, message }` body. Callers can switch on `code` to map to
 * specific HTTP responses for the mobile client.
 */
export class KycMlError extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: number,
  ) {
    super({ code, message }, status);
  }
}

/** Returned by `isEnabled()` so callers don't need to read config themselves. */
@Injectable()
export class KycMlClient {
  private readonly logger = new Logger(KycMlClient.name);
  private readonly baseUrl: string;
  private readonly secret: string;
  private readonly timeoutMs: number;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (
      this.config.get<string>('KYC_ML_BASE_URL', '') || ''
    ).replace(/\/+$/, '');
    this.secret = this.config.get<string>('KYC_ML_SHARED_SECRET', '') || '';
    this.timeoutMs = Number(
      this.config.get<string>('KYC_ML_TIMEOUT_MS', '30000') || 30000,
    );
    // Both flags must be set: the explicit feature flag *and* the connection
    // info. Either missing → callers fall back to the existing mock flow so
    // dev/CI without the sidecar continues to work.
    const flag = (
      this.config.get<string>('KYC_ML_ENABLED', 'false') || 'false'
    ).toLowerCase();
    this.enabled = flag === 'true' && !!this.baseUrl && !!this.secret;
    if (!this.enabled) {
      this.logger.log(
        `KycMlClient disabled (KYC_ML_ENABLED=${flag}, baseUrl=${
          this.baseUrl ? 'set' : 'unset'
        }, secret=${this.secret ? 'set' : 'unset'}) — falling back to mocks`,
      );
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * POST /process-aadhaar — uploads an Aadhaar image and returns extracted
   * fields. The cropped Aadhaar face is stored server-side in Supabase.
   *
   * @throws KycMlError when the sidecar returns a structured 4xx error
   *   (e.g. NO_FACE_AADHAAR, OCR_FAILED, INVALID_IMAGE).
   * @throws ServiceUnavailableException for network/5xx errors.
   */
  async processAadhaar(args: {
    userId: string;
    fileBuffer: Buffer;
    mimeType: string;
    filename?: string;
  }): Promise<KycMlAadhaarExtraction> {
    this.assertEnabled();
    const form = new FormData();
    const blob = new Blob([new Uint8Array(args.fileBuffer)], {
      type: args.mimeType,
    });
    form.append('image', blob, args.filename ?? 'aadhaar.jpg');
    return this.postMultipart<KycMlAadhaarExtraction>(
      '/process-aadhaar',
      args.userId,
      form,
    );
  }

  /**
   * POST /verify-patient-identity — uploads a live selfie and compares it
   * against the previously stored Aadhaar face. The sidecar always cleans
   * up the cropped Aadhaar face after this call (success or fail).
   */
  async verifyPatientIdentity(args: {
    userId: string;
    fileBuffer: Buffer;
    mimeType: string;
    filename?: string;
  }): Promise<KycMlFaceMatch> {
    this.assertEnabled();
    const form = new FormData();
    const blob = new Blob([new Uint8Array(args.fileBuffer)], {
      type: args.mimeType,
    });
    form.append('selfie', blob, args.filename ?? 'selfie.jpg');
    return this.postMultipart<KycMlFaceMatch>(
      '/verify-patient-identity',
      args.userId,
      form,
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // internals
  // ──────────────────────────────────────────────────────────────────

  private assertEnabled(): void {
    if (!this.enabled) {
      throw new ServiceUnavailableException('kyc-ml service not enabled');
    }
  }

  private buildHeaders(userId: string): Record<string, string> {
    const ts = new Date().toISOString();
    const sig = createHmac('sha256', this.secret)
      .update(`${userId}:${ts}`)
      .digest('hex');
    return {
      'X-Internal-Token': sig,
      'X-Internal-Timestamp': ts,
      'X-User-Id': userId,
    };
  }

  private async postMultipart<T>(
    path: string,
    userId: string,
    body: FormData,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(userId),
        body,
        signal: controller.signal,
      });
      const text = await resp.text();
      let payload: unknown = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        payload = { code: 'BAD_RESPONSE', message: text || resp.statusText };
      }

      if (!resp.ok) {
        const body = payload as { code?: string; message?: string } | null;
        const code = body?.code ?? 'KYC_ML_HTTP_ERROR';
        const msg = body?.message ?? `kyc-ml ${path} returned ${resp.status}`;
        // Surface 4xx as structured KycMlError; collapse 5xx to 503 so the
        // mobile client sees a uniform "service unavailable" surface.
        if (resp.status >= 500) {
          this.logger.error(`kyc-ml ${path} 5xx for ${userId}: ${code} ${msg}`);
          throw new ServiceUnavailableException(
            'identity verification service unavailable',
          );
        }
        throw new KycMlError(code, msg, resp.status);
      }
      return payload as T;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const isAbort = err instanceof Error && err.name === 'AbortError';
      this.logger.error(
        `kyc-ml ${path} ${isAbort ? 'timeout' : 'network error'} for ${userId}: ${
          (err as Error).message
        }`,
      );
      throw new ServiceUnavailableException(
        isAbort
          ? 'identity verification service timed out'
          : 'identity verification service unavailable',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

/**
 * Maps a `KycMlError.code` from the sidecar to the HTTP status the mobile
 * client should see. Kept here (not in the controller) so unit tests can
 * exercise the mapping in isolation.
 */
export function mapKycMlErrorStatus(code: string): HttpStatus {
  switch (code) {
    case 'NO_FACE_AADHAAR':
    case 'NO_FACE_SELFIE':
      return HttpStatus.CONFLICT;
    case 'LOW_CONFIDENCE':
      return HttpStatus.UNPROCESSABLE_ENTITY;
    case 'AADHAAR_FACE_NOT_FOUND':
      return HttpStatus.NOT_FOUND;
    case 'INVALID_IMAGE':
    case 'OCR_FAILED':
      return HttpStatus.BAD_REQUEST;
    default:
      return HttpStatus.BAD_GATEWAY;
  }
}

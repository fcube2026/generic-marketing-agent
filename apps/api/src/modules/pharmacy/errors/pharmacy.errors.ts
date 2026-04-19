/**
 * Standardized error hierarchy for the Pharmacy Integration module.
 *
 * PharmacyError          – base class (non-retryable by default)
 *  └─ PharmacyTransientError   – network blips, timeouts, 5xx; safe to retry
 *  └─ PharmacyProviderError    – the partner API returned a business error
 *  └─ PharmacyCircuitOpenError – circuit breaker is open; do not retry
 *  └─ PharmacyValidationError  – bad input; do not retry
 */

export class PharmacyError extends Error {
  /** Human-readable identifier for metrics / alerting. */
  readonly code: string;
  /** Extra context forwarded to the logger. */
  readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code = 'PHARMACY_ERROR',
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
  }
}

/** Retryable errors – transient network issues, provider 5xx, timeouts. */
export class PharmacyTransientError extends PharmacyError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'PHARMACY_TRANSIENT_ERROR', context);
  }
}

/** The partner API responded, but returned a business-level failure. */
export class PharmacyProviderError extends PharmacyError {
  readonly httpStatus?: number;

  constructor(
    message: string,
    httpStatus?: number,
    context?: Record<string, unknown>,
  ) {
    super(message, 'PHARMACY_PROVIDER_ERROR', context);
    this.httpStatus = httpStatus;
  }
}

/** Circuit breaker tripped – the provider is temporarily unavailable. */
export class PharmacyCircuitOpenError extends PharmacyError {
  constructor(providerName: string) {
    super(
      `Pharmacy provider "${providerName}" is temporarily unavailable (circuit open)`,
      'PHARMACY_CIRCUIT_OPEN',
      { providerName },
    );
  }
}

/** Invalid request input; retrying will not help. */
export class PharmacyValidationError extends PharmacyError {
  constructor(message: string) {
    super(message, 'PHARMACY_VALIDATION_ERROR');
  }
}

/**
 * Maps an unknown thrown value to one of the internal error types.
 * Preserves `PharmacyError` subclasses as-is; wraps everything else in
 * `PharmacyTransientError` so that retry logic can decide what to do.
 */
export function toPharmacyError(err: unknown): PharmacyError {
  if (err instanceof PharmacyError) return err;

  const message = err instanceof Error ? err.message : 'Unknown pharmacy error';

  // Treat connection-level errors as transient
  if (
    err instanceof Error &&
    (err.message.includes('ECONNREFUSED') ||
      err.message.includes('ETIMEDOUT') ||
      err.message.includes('fetch failed') ||
      err.message.includes('network'))
  ) {
    return new PharmacyTransientError(message);
  }

  return new PharmacyProviderError(message);
}

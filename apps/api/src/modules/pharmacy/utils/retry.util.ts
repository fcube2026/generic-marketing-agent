import { Logger } from '@nestjs/common';
import { PharmacyTransientError } from '../errors/pharmacy.errors';

export interface RetryOptions {
  /** Maximum number of attempts (including the first). Default: 3 */
  maxAttempts?: number;
  /** Delay before the 2nd attempt, in ms.  Doubles each retry. Default: 200 */
  baseDelayMs?: number;
  /** Hard cap on the inter-retry delay.  Default: 5 000 */
  maxDelayMs?: number;
  /** Add up to this many ms of random jitter to each delay.  Default: 100 */
  jitterMs?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelayMs: 200,
  maxDelayMs: 5_000,
  jitterMs: 100,
};

const logger = new Logger('RetryUtil');

/**
 * Runs `fn` with exponential-backoff retries.
 *
 * Only `PharmacyTransientError` (and its subclasses) trigger a retry.
 * Any other error is re-thrown immediately.
 *
 * @param fn        The async operation to execute.
 * @param options   Retry policy.
 * @param context   Used for log messages (e.g. provider name + operation).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
  context = 'operation',
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      const isTransient = err instanceof PharmacyTransientError;
      const isFinalAttempt = attempt === opts.maxAttempts;

      if (!isTransient || isFinalAttempt) {
        if (attempt > 1) {
          logger.warn(
            `[retry] ${context} failed on attempt ${attempt}/${opts.maxAttempts} — giving up`,
          );
        }
        throw err;
      }

      const exponentialDelay = Math.min(
        opts.baseDelayMs * Math.pow(2, attempt - 1),
        opts.maxDelayMs,
      );
      const jitter = Math.random() * opts.jitterMs;
      const delayMs = Math.round(exponentialDelay + jitter);

      logger.warn(
        `[retry] ${context} failed on attempt ${attempt}/${opts.maxAttempts} — retrying in ${delayMs}ms`,
        { error: (err as Error).message },
      );

      await sleep(delayMs);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

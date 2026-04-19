import { Logger } from '@nestjs/common';
import { PharmacyCircuitOpenError } from '../errors/pharmacy.errors';

export enum CircuitState {
  /** Requests flow through normally. */
  CLOSED = 'CLOSED',
  /** Too many failures — requests are rejected immediately. */
  OPEN = 'OPEN',
  /** One test request is allowed through to check if the provider recovered. */
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening the circuit. Default: 5 */
  failureThreshold?: number;
  /** How long (ms) the circuit stays OPEN before moving to HALF_OPEN. Default: 30 000 */
  resetTimeoutMs?: number;
}

/**
 * Basic circuit-breaker that wraps calls to an external provider.
 *
 * State machine:
 *   CLOSED  →  OPEN       (after `failureThreshold` consecutive failures)
 *   OPEN    →  HALF_OPEN  (after `resetTimeoutMs` has elapsed)
 *   HALF_OPEN → CLOSED    (if the next call succeeds)
 *   HALF_OPEN → OPEN      (if the next call fails)
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly logger: Logger;

  constructor(
    private readonly name: string,
    options: CircuitBreakerOptions = {},
  ) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30_000;
    this.logger = new Logger(`CircuitBreaker:${name}`);
  }

  get currentState(): CircuitState {
    return this.state;
  }

  /**
   * Execute `fn` through the circuit breaker.
   * Throws `PharmacyCircuitOpenError` when the circuit is OPEN.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.transitionIfNeeded();

    if (this.state === CircuitState.OPEN) {
      throw new PharmacyCircuitOpenError(this.name);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private transitionIfNeeded(): void {
    if (
      this.state === CircuitState.OPEN &&
      Date.now() - this.lastFailureTime >= this.resetTimeoutMs
    ) {
      this.logger.log(
        `Circuit transitioning OPEN → HALF_OPEN after ${this.resetTimeoutMs}ms timeout`,
      );
      this.state = CircuitState.HALF_OPEN;
    }
  }

  private onSuccess(): void {
    if (this.state !== CircuitState.CLOSED) {
      this.logger.log(`Circuit transitioning ${this.state} → CLOSED`);
    }
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (
      this.state === CircuitState.HALF_OPEN ||
      this.failureCount >= this.failureThreshold
    ) {
      this.logger.warn(
        `Circuit transitioning ${this.state} → OPEN ` +
          `(failures: ${this.failureCount}, threshold: ${this.failureThreshold})`,
      );
      this.state = CircuitState.OPEN;
    }
  }
}

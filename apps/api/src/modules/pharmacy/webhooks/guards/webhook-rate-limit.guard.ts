import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
  Optional,
} from '@nestjs/common';

/**
 * Simple in-memory rate limiter guard for the webhook endpoint.
 *
 * Tracks request counts per IP within a sliding time window.
 * This is a basic implementation suitable for the mock environment.
 * For production, use a distributed rate limiter (e.g., Redis-based).
 */
@Injectable()
export class WebhookRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(WebhookRateLimitGuard.name);

  /** Max requests allowed within the window. */
  private readonly maxRequests: number;

  /** Time window in milliseconds. */
  private readonly windowMs: number;

  /** Request timestamps per IP. */
  private readonly requestLog = new Map<string, number[]>();

  /**
   * @param maxRequests - Max requests within the window (default: 60).
   * @param windowMs   - Window duration in ms (default: 60 000).
   *
   * When NestJS instantiates this guard via DI it calls `new WebhookRateLimitGuard()`
   * with no arguments, so the defaults apply. Tests can pass custom values directly.
   */
  constructor(@Optional() maxRequests?: number, @Optional() windowMs?: number) {
    this.maxRequests = maxRequests ?? 60;
    this.windowMs = windowMs ?? 60_000;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip: string =
      request.ip || request.connection?.remoteAddress || 'unknown';

    const now = Date.now();
    const timestamps = this.requestLog.get(ip) || [];

    // Remove timestamps outside the window
    const validTimestamps = timestamps.filter((ts) => now - ts < this.windowMs);

    if (validTimestamps.length >= this.maxRequests) {
      this.logger.warn(
        `[rate-limit] Rate limit exceeded for IP=${ip} (${validTimestamps.length}/${this.maxRequests})`,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many webhook requests. Please try again later.',
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    validTimestamps.push(now);
    this.requestLog.set(ip, validTimestamps);

    // Periodically clean up stale entries
    if (this.requestLog.size > 1000) {
      this.cleanupStaleEntries(now);
    }

    return true;
  }

  private cleanupStaleEntries(now: number): void {
    for (const [ip, timestamps] of this.requestLog.entries()) {
      const valid = timestamps.filter((ts) => now - ts < this.windowMs);
      if (valid.length === 0) {
        this.requestLog.delete(ip);
      } else {
        this.requestLog.set(ip, valid);
      }
    }
  }
}

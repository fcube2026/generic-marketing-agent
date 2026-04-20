import { WebhookRateLimitGuard } from './webhook-rate-limit.guard';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';

describe('WebhookRateLimitGuard', () => {
  let guard: WebhookRateLimitGuard;

  const createMockContext = (ip = '127.0.0.1'): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          ip,
          connection: { remoteAddress: ip },
        }),
      }),
    } as any;
  };

  beforeEach(() => {
    guard = new WebhookRateLimitGuard(5, 10_000); // 5 requests per 10 seconds
  });

  it('allows requests within the limit', () => {
    const ctx = createMockContext();

    for (let i = 0; i < 5; i++) {
      expect(guard.canActivate(ctx)).toBe(true);
    }
  });

  it('blocks requests exceeding the limit', () => {
    const ctx = createMockContext();

    for (let i = 0; i < 5; i++) {
      guard.canActivate(ctx);
    }

    expect(() => guard.canActivate(ctx)).toThrow(HttpException);

    try {
      guard.canActivate(ctx);
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  });

  it('tracks different IPs independently', () => {
    const ctx1 = createMockContext('192.168.1.1');
    const ctx2 = createMockContext('192.168.1.2');

    // Fill up the limit for IP1
    for (let i = 0; i < 5; i++) {
      guard.canActivate(ctx1);
    }

    // IP2 should still be able to make requests
    expect(guard.canActivate(ctx2)).toBe(true);
  });

  it('allows requests after the window expires', () => {
    jest.useFakeTimers();
    const ctx = createMockContext();

    for (let i = 0; i < 5; i++) {
      guard.canActivate(ctx);
    }

    // Advance time past the window
    jest.advanceTimersByTime(11_000);

    expect(guard.canActivate(ctx)).toBe(true);

    jest.useRealTimers();
  });
});

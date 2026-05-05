import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple in-memory token-bucket rate limiter, scoped per Node.js process.
 *
 * Good enough for a single Vercel instance / dev server; for multi-instance
 * production deployments, swap for Upstash/Redis.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Max requests per window. */
  max: number;
  /** Window length, in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const fresh: Bucket = { count: 1, resetAt: now + opts.windowMs };
    buckets.set(key, fresh);
    return { allowed: true, remaining: opts.max - 1, resetAt: fresh.resetAt };
  }

  if (existing.count >= opts.max) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: opts.max - existing.count, resetAt: existing.resetAt };
}

/** Best-effort client identifier: bearer token > IP address > 'anonymous'. */
export function getClientKey(req: NextRequest): string {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    // Hash-ish: just take the last 16 chars of the token to avoid storing it raw.
    const token = auth.slice(7);
    return `tok:${token.slice(-16)}`;
  }
  const fwd = req.headers.get('x-forwarded-for');
  const ip = fwd?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'anonymous';
  return `ip:${ip}`;
}

export function rateLimitResponse(result: RateLimitResult) {
  return NextResponse.json(
    {
      error: 'Rate limit exceeded. Please slow down and retry shortly.',
      code: 'rate_limited',
      resetAt: result.resetAt,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))),
      },
    },
  );
}

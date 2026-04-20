import { NextRequest, NextResponse } from 'next/server';

/**
 * Resolves the upstream API base URL using the same precedence as
 * `next.config.js` rewrites (VERCEL_ENV → NEXT_PUBLIC_API_URL → localhost).
 *
 * Used server-side from API routes to verify the marketing-agent JWT
 * against the backend before invoking expensive AI providers.
 */
function getApiBaseUrl(): string {
  if (process.env.VERCEL_ENV === 'production') return 'https://api.curex24.com/api/v1';
  if (process.env.VERCEL_ENV === 'preview') return 'https://api.staging.curex24.com/api/v1';
  return (process.env.NEXT_PUBLIC_API_URL || '').trim() || 'http://localhost:3000/api/v1';
}

export interface AuthFailure {
  response: NextResponse;
  ok: false;
}
export interface AuthSuccess {
  ok: true;
  token: string;
}
export type AuthResult = AuthSuccess | AuthFailure;

/**
 * Extracts a Bearer token from the request and verifies it against the
 * existing marketing API by hitting the cheap `/marketing/profile` endpoint.
 * Returns either an authenticated result or a NextResponse to short-circuit
 * the route with a 401/upstream-error.
 */
export async function requireMarketingAuth(req: NextRequest): Promise<AuthResult> {
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.toLowerCase().startsWith('bearer ')) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Missing Bearer token', code: 'unauthorized' },
        { status: 401 },
      ),
    };
  }
  const token = auth.slice(7).trim();
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Empty Bearer token', code: 'unauthorized' },
        { status: 401 },
      ),
    };
  }

  // In test/dev environments allow bypassing the upstream check so unit tests
  // and local mock setups don't need a live backend.
  if (process.env.MARKETING_AGENT_SKIP_AUTH === 'true') {
    return { ok: true, token };
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}/marketing/profile`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      // Don't cache auth checks.
      cache: 'no-store',
    });
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Invalid or expired token', code: 'unauthorized' },
          { status: 401 },
        ),
      };
    }
    if (!res.ok && res.status !== 404) {
      // 404 means the endpoint exists but no profile yet — token is still valid.
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Auth backend unavailable', code: 'upstream_unavailable' },
          { status: 502 },
        ),
      };
    }
    return { ok: true, token };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Auth backend unreachable', code: 'upstream_unreachable' },
        { status: 502 },
      ),
    };
  }
}

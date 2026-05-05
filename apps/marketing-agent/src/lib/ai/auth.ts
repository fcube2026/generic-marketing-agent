import { NextRequest, NextResponse } from 'next/server';

/**
 * Resolves the upstream API base URL from `NEXT_PUBLIC_API_URL`. Used
 * server-side to verify the marketing-agent JWT against an external backend
 * before invoking expensive AI providers. Returns null when no external
 * backend is configured (the default self-contained mode), in which case
 * we accept any well-formed bearer token without an upstream check.
 */
function getApiBaseUrl(): string | null {
  const url = (process.env.NEXT_PUBLIC_API_URL || '').trim();
  return url || null;
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

  // No external backend configured → self-contained mode. The local
  // /api/auth/marketing-login route mints JWT-shaped tokens that we trust
  // without an upstream check.
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return { ok: true, token };
  }

  try {
    const res = await fetch(`${baseUrl}/marketing/profile`, {
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

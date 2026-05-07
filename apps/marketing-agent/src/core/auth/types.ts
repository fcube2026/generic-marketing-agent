/**
 * `AuthAdapter` — pluggable authentication and tenant-resolution.
 *
 * Routes call `adapter.authorize(request)` at the boundary; the resulting
 * `TenantContext` is threaded through every `DataSource` and `AiProvider`
 * call. Implementations: NextAuth, Clerk, Supabase, JWT, none.
 *
 * The "none" adapter (`AnonymousAuthAdapter`) is the default — it returns
 * the single default tenant for zero-config local dev and preserves the
 * existing marketing-agent UX exactly.
 */

import type { Tenant, TenantContext } from '../tenant/types';
import { DEFAULT_TENANT } from '../tenant/types';

/**
 * Minimal request shape the adapter can read. Compatible with `Request`,
 * `NextRequest`, `IncomingMessage` (after wrapping), or a Worker `Request`.
 */
export interface AuthRequest {
  headers: { get(name: string): string | null } | Record<string, string | undefined>;
  url?: string;
  method?: string;
}

export interface AuthResult {
  /** The tenant + principal the rest of the request runs under. */
  context: TenantContext;
}

export class AuthError extends Error {
  constructor(message: string, readonly status = 401) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface AuthAdapter {
  readonly name: string;
  /** Resolve the tenant + principal for an incoming request. */
  authorize(req: AuthRequest): Promise<AuthResult>;
}

export function readHeader(req: AuthRequest, name: string): string | null {
  const h = req.headers as { get?: (n: string) => string | null } & Record<string, unknown>;
  if (typeof h.get === 'function') return h.get(name);
  const v = h[name] ?? h[name.toLowerCase()];
  return typeof v === 'string' ? v : null;
}

/**
 * Default zero-config adapter: returns the in-built default tenant for
 * every request. Used when no `auth` is provided in `agent.config.ts` so
 * the local dev experience needs no setup.
 */
export class AnonymousAuthAdapter implements AuthAdapter {
  readonly name = 'anonymous';

  constructor(private readonly tenant: Tenant = DEFAULT_TENANT) {}

  async authorize(): Promise<AuthResult> {
    return { context: { tenant: this.tenant } };
  }
}

/**
 * Resolves the tenant from the `x-tenant-id` header (set by gateways or
 * client SDKs). Falls back to the supplied default. No real cred check —
 * pair with a real auth adapter when you need one.
 */
export class HeaderTenantAuthAdapter implements AuthAdapter {
  readonly name = 'header-tenant';

  constructor(
    private readonly resolveTenant: (id: string) => Promise<Tenant | null> | Tenant | null,
    private readonly fallback: Tenant = DEFAULT_TENANT,
  ) {}

  async authorize(req: AuthRequest): Promise<AuthResult> {
    const id = readHeader(req, 'x-tenant-id');
    if (!id) return { context: { tenant: this.fallback } };
    const tenant = (await this.resolveTenant(id)) ?? this.fallback;
    return { context: { tenant } };
  }
}

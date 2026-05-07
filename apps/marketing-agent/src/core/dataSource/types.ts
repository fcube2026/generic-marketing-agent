/**
 * `DataSource` — the database-agnostic seam.
 *
 * Adapters: in-memory mock (default), Prisma (Postgres/MySQL/SQLite), Mongo,
 * Supabase, Firestore, REST passthrough. All adapters speak the same
 * generic resource API so swapping is a one-env-var change.
 *
 * Resources are intentionally generic: `(tenantId, type, id, data)`. The
 * shape of `data` is owned by the active `DomainPack`, which validates it
 * on read/write — so a single SQL schema (`resources(jsonb)`) or a single
 * Mongo collection serves any vertical without per-domain migrations.
 */

import type { TenantContext } from '../tenant/types';

/**
 * High-level description of where the active data is coming from. Surfaced
 * to the UI banner so users always know which backend is in play.
 */
export interface DataSourceStatus {
  kind: 'mock' | 'prisma' | 'mongo' | 'rest' | 'supabase' | 'firestore' | string;
  label: string;
  /** Human-readable detail (host/db for SQL, base URL for REST, etc.). */
  detail?: string;
  /** True when the data source is configured but failed to connect. */
  degraded?: boolean;
  /** Last error message if degraded. */
  error?: string;
}

/** A persisted item, scoped to a tenant + resource type. */
export interface Resource<T = Record<string, unknown>> {
  id: string;
  tenantId: string;
  type: string;
  data: T;
  /** Monotonic version for optimistic concurrency (adapter-managed). */
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListOptions {
  /** Filter by an exact-match field inside `data`. */
  where?: Record<string, unknown>;
  /** Pagination — adapters that don't support cursors can ignore. */
  limit?: number;
  cursor?: string;
  /** `field:asc` / `field:desc`. Adapters fall back to insertion order. */
  orderBy?: string;
}

export interface ListResult<T> {
  items: Resource<T>[];
  nextCursor?: string;
}

/**
 * The contract every database adapter implements.
 *
 * NB: keep this interface small and generic. Domain-specific helpers
 * (e.g. "list active campaigns for the next 30 days") belong in
 * `core/domain/*` and call into this surface.
 */
export interface DataSource {
  readonly status: DataSourceStatus;

  /** Optional connection lifecycle. Implementations may no-op. */
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;

  /** Get a single resource by `(type, id)` for the tenant. Returns null if missing. */
  get<T = Record<string, unknown>>(
    ctx: TenantContext,
    type: string,
    id: string,
  ): Promise<Resource<T> | null>;

  list<T = Record<string, unknown>>(
    ctx: TenantContext,
    type: string,
    opts?: ListOptions,
  ): Promise<ListResult<T>>;

  create<T = Record<string, unknown>>(
    ctx: TenantContext,
    type: string,
    data: T,
    id?: string,
  ): Promise<Resource<T>>;

  update<T = Record<string, unknown>>(
    ctx: TenantContext,
    type: string,
    id: string,
    patch: Partial<T>,
  ): Promise<Resource<T> | null>;

  delete(ctx: TenantContext, type: string, id: string): Promise<boolean>;

  /**
   * Singleton resources (e.g. tenant profile, intake responses). Adapters
   * implement this on top of `get`/`create`/`update` if they don't have a
   * native concept of singletons.
   */
  getSingleton<T = Record<string, unknown>>(
    ctx: TenantContext,
    type: string,
  ): Promise<T | null>;

  putSingleton<T = Record<string, unknown>>(
    ctx: TenantContext,
    type: string,
    data: T,
  ): Promise<T>;

  /**
   * Optional: produce *live* values for the active domain pack's KPIs.
   *
   * Returned as a flat `{ kpiId: value }` map. The router merges these
   * onto the static `pack.kpis` definitions so the dashboard can render
   * `target` (from the pack) alongside `value` (from the data source).
   *
   * Adapters that don't compute KPIs (memory / generic Prisma / REST)
   * simply omit this method and the route falls back to the static
   * definitions only.
   */
  computeKpis?(ctx: TenantContext): Promise<Record<string, string | number>>;
}

export class ReadOnlyDataSourceError extends Error {
  constructor(resource: string) {
    super(`Data source is read-only for resource: ${resource}`);
    this.name = 'ReadOnlyDataSourceError';
  }
}

export class DataSourceNotConfiguredError extends Error {
  constructor(kind: string, hint: string) {
    super(`DataSource "${kind}" is not configured: ${hint}`);
    this.name = 'DataSourceNotConfiguredError';
  }
}

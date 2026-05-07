/**
 * In-memory `DataSource` for dev / tests / preview.
 *
 * Stores resources in a `Map<tenantId, Map<type, Map<id, Resource>>>` so it
 * naturally supports multiple tenants. Survives Next.js dev hot reloads via
 * a `globalThis` cache.
 */

import type {
  DataSource,
  DataSourceStatus,
  ListOptions,
  ListResult,
  Resource,
} from './types';
import type { TenantContext } from '../tenant/types';

type Bucket = Map<string, Map<string, Resource>>;

interface MemoryStore {
  buckets: Map<string, Bucket>;
  singletons: Map<string, Map<string, unknown>>;
  idCounter: number;
}

type GlobalWithStore = typeof globalThis & { __agentMemoryStore?: MemoryStore };

function getStore(): MemoryStore {
  const g = globalThis as GlobalWithStore;
  if (!g.__agentMemoryStore) {
    g.__agentMemoryStore = {
      buckets: new Map(),
      singletons: new Map(),
      idCounter: Date.now(),
    };
  }
  return g.__agentMemoryStore;
}

function bucketFor(store: MemoryStore, tenantId: string, type: string): Map<string, Resource> {
  let tenant = store.buckets.get(tenantId);
  if (!tenant) {
    tenant = new Map();
    store.buckets.set(tenantId, tenant);
  }
  let typed = tenant.get(type);
  if (!typed) {
    typed = new Map();
    tenant.set(type, typed);
  }
  return typed;
}

function singletonsFor(store: MemoryStore, tenantId: string): Map<string, unknown> {
  let tenant = store.singletons.get(tenantId);
  if (!tenant) {
    tenant = new Map();
    store.singletons.set(tenantId, tenant);
  }
  return tenant;
}

function nextId(store: MemoryStore, prefix: string): string {
  store.idCounter += 1;
  return `${prefix}_${store.idCounter.toString(36)}`;
}

function clone<T>(v: T): T {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

function matches(data: Record<string, unknown>, where: Record<string, unknown>): boolean {
  for (const [k, expected] of Object.entries(where)) {
    if (data[k] !== expected) return false;
  }
  return true;
}

export interface MemoryDataSourceOptions {
  /**
   * Optional seed callback: receives the data source on first construction
   * so a domain pack can populate its starter content. Called once per
   * (tenantId, type) pair to keep idempotency.
   */
  seed?: (ds: MemoryDataSource) => void | Promise<void>;
}

export class MemoryDataSource implements DataSource {
  readonly status: DataSourceStatus = {
    kind: 'mock',
    label: 'In-memory',
    detail: 'Resets on server restart',
  };

  private store = getStore();
  private seedPromise: Promise<void> | null = null;

  constructor(private readonly opts: MemoryDataSourceOptions = {}) {}

  private async ensureSeeded(): Promise<void> {
    if (!this.opts.seed) return;
    if (!this.seedPromise) {
      this.seedPromise = Promise.resolve(this.opts.seed(this)).then(() => undefined);
    }
    await this.seedPromise;
  }

  async get<T = Record<string, unknown>>(
    ctx: TenantContext,
    type: string,
    id: string,
  ): Promise<Resource<T> | null> {
    await this.ensureSeeded();
    const r = bucketFor(this.store, ctx.tenant.id, type).get(id);
    return r ? (clone(r) as Resource<T>) : null;
  }

  async list<T = Record<string, unknown>>(
    ctx: TenantContext,
    type: string,
    opts: ListOptions = {},
  ): Promise<ListResult<T>> {
    await this.ensureSeeded();
    const all = Array.from(bucketFor(this.store, ctx.tenant.id, type).values());
    const filtered = opts.where
      ? all.filter((r) => matches(r.data as Record<string, unknown>, opts.where!))
      : all;
    const limited = opts.limit != null ? filtered.slice(0, opts.limit) : filtered;
    return { items: clone(limited) as Resource<T>[] };
  }

  async create<T = Record<string, unknown>>(
    ctx: TenantContext,
    type: string,
    data: T,
    id?: string,
  ): Promise<Resource<T>> {
    await this.ensureSeeded();
    const now = new Date().toISOString();
    const resource: Resource<T> = {
      id: id ?? nextId(this.store, type.slice(0, 4)),
      tenantId: ctx.tenant.id,
      type,
      data: clone(data),
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    bucketFor(this.store, ctx.tenant.id, type).set(resource.id, resource as Resource);
    return clone(resource);
  }

  async update<T = Record<string, unknown>>(
    ctx: TenantContext,
    type: string,
    id: string,
    patch: Partial<T>,
  ): Promise<Resource<T> | null> {
    await this.ensureSeeded();
    const bucket = bucketFor(this.store, ctx.tenant.id, type);
    const existing = bucket.get(id);
    if (!existing) return null;
    const merged: Resource<T> = {
      ...(existing as Resource<T>),
      data: { ...(existing.data as object), ...(patch as object) } as T,
      version: (existing.version ?? 1) + 1,
      updatedAt: new Date().toISOString(),
    };
    bucket.set(id, merged as Resource);
    return clone(merged);
  }

  async delete(ctx: TenantContext, type: string, id: string): Promise<boolean> {
    await this.ensureSeeded();
    return bucketFor(this.store, ctx.tenant.id, type).delete(id);
  }

  async getSingleton<T = Record<string, unknown>>(
    ctx: TenantContext,
    type: string,
  ): Promise<T | null> {
    await this.ensureSeeded();
    const v = singletonsFor(this.store, ctx.tenant.id).get(type);
    return v == null ? null : (clone(v) as T);
  }

  async putSingleton<T = Record<string, unknown>>(
    ctx: TenantContext,
    type: string,
    data: T,
  ): Promise<T> {
    await this.ensureSeeded();
    const cloned = clone(data);
    singletonsFor(this.store, ctx.tenant.id).set(type, cloned);
    return clone(cloned);
  }
}

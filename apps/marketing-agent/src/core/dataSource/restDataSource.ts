/**
 * REST-passthrough `DataSource`. Delegates every operation to a remote agent
 * server speaking the same `/agent/v1/*` URL shape (which is exactly what
 * `core/agent/handleRequest.ts` exposes — meaning two agent processes can
 * be chained transparently).
 *
 * Useful when the marketing-agent UI is deployed separately from the data
 * tier, or when an Expo app talks back to a Node host.
 */

import type {
  DataSource,
  DataSourceStatus,
  ListOptions,
  ListResult,
  Resource,
} from './types';
import type { TenantContext } from '../tenant/types';

interface RestOptions {
  baseUrl: string;
  /** Bearer token applied to every request. May be a function for refresh. */
  token?: string | (() => Promise<string>);
  /** Extra headers (e.g. `x-agent-key`). */
  headers?: Record<string, string>;
  /** Optional fetch override (for tests / non-browser runtimes). */
  fetchImpl?: typeof fetch;
}

export class RestDataSource implements DataSource {
  readonly status: DataSourceStatus;
  private fetch: typeof fetch;

  constructor(private readonly opts: RestOptions | Record<string, unknown>) {
    const o = opts as RestOptions;
    if (!o.baseUrl) throw new Error('RestDataSource: `baseUrl` is required.');
    this.fetch = o.fetchImpl ?? fetch;
    this.status = {
      kind: 'rest',
      label: 'REST passthrough',
      detail: o.baseUrl,
    };
  }

  private async authHeader(): Promise<Record<string, string>> {
    const o = this.opts as RestOptions;
    if (!o.token) return {};
    const tok = typeof o.token === 'function' ? await o.token() : o.token;
    return { authorization: `Bearer ${tok}` };
  }

  private async req<T>(
    method: string,
    path: string,
    ctx: TenantContext,
    body?: unknown,
  ): Promise<T | null> {
    const o = this.opts as RestOptions;
    const url = `${o.baseUrl.replace(/\/+$/, '')}${path}`;
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-tenant-id': ctx.tenant.id,
      ...(o.headers ?? {}),
      ...(await this.authHeader()),
    };
    const res = await this.fetch(url, {
      method,
      headers,
      body: body == null ? undefined : JSON.stringify(body),
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`RestDataSource ${method} ${path} → ${res.status}: ${txt}`);
    }
    if (res.status === 204) return null;
    return (await res.json()) as T;
  }

  async get<T>(ctx: TenantContext, type: string, id: string): Promise<Resource<T> | null> {
    return this.req<Resource<T>>('GET', `/resources/${enc(type)}/${enc(id)}`, ctx);
  }

  async list<T>(
    ctx: TenantContext,
    type: string,
    opts: ListOptions = {},
  ): Promise<ListResult<T>> {
    const qs = new URLSearchParams();
    if (opts.limit != null) qs.set('limit', String(opts.limit));
    if (opts.cursor) qs.set('cursor', opts.cursor);
    if (opts.orderBy) qs.set('orderBy', opts.orderBy);
    if (opts.where) qs.set('where', JSON.stringify(opts.where));
    const path = `/resources/${enc(type)}${qs.toString() ? `?${qs}` : ''}`;
    const result = await this.req<ListResult<T>>('GET', path, ctx);
    return result ?? { items: [] };
  }

  async create<T>(
    ctx: TenantContext,
    type: string,
    data: T,
    id?: string,
  ): Promise<Resource<T>> {
    const result = await this.req<Resource<T>>(
      'POST',
      `/resources/${enc(type)}`,
      ctx,
      { data, id },
    );
    if (!result) throw new Error('RestDataSource: create returned no body');
    return result;
  }

  async update<T>(
    ctx: TenantContext,
    type: string,
    id: string,
    patch: Partial<T>,
  ): Promise<Resource<T> | null> {
    return this.req<Resource<T>>('PATCH', `/resources/${enc(type)}/${enc(id)}`, ctx, patch);
  }

  async delete(ctx: TenantContext, type: string, id: string): Promise<boolean> {
    try {
      await this.req<unknown>('DELETE', `/resources/${enc(type)}/${enc(id)}`, ctx);
      return true;
    } catch {
      return false;
    }
  }

  async getSingleton<T>(ctx: TenantContext, type: string): Promise<T | null> {
    return this.req<T>('GET', `/singletons/${enc(type)}`, ctx);
  }

  async putSingleton<T>(ctx: TenantContext, type: string, data: T): Promise<T> {
    const result = await this.req<T>('PUT', `/singletons/${enc(type)}`, ctx, data);
    if (result == null) throw new Error('RestDataSource: putSingleton returned no body');
    return result;
  }
}

const enc = encodeURIComponent;

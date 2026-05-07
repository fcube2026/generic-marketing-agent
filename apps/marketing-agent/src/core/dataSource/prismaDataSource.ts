/**
 * Prisma-backed `DataSource` (optional adapter).
 *
 * Stores every resource in a single generic table:
 *
 *   model AgentResource {
 *     id        String   @id
 *     tenantId  String
 *     type      String
 *     data      Json
 *     version   Int      @default(1)
 *     createdAt DateTime @default(now())
 *     updatedAt DateTime @updatedAt
 *     @@index([tenantId, type])
 *     @@unique([tenantId, type, id])
 *   }
 *
 * One generic schema serves any domain pack — adding a new vertical never
 * requires a migration. Singletons are stored as resources with a synthetic
 * id of `__singleton__`.
 *
 * The Prisma client is loaded via dynamic `import()` inside try/catch so
 * the bundler never resolves `@prisma/client` at build time. If Prisma
 * isn't installed, the factory surfaces a clean `DataSourceNotConfiguredError`
 * instead of the cryptic `Module not found` failure we used to hit.
 */

import type {
  DataSource,
  DataSourceStatus,
  ListOptions,
  ListResult,
  Resource,
} from './types';
import type { TenantContext } from '../tenant/types';

const SINGLETON_ID = '__singleton__';

interface PrismaOptions {
  datasourceUrl?: string;
  /** Pass an already-instantiated `PrismaClient` to share connections. */
  client?: unknown;
  /** Override the model name on the Prisma client (default: "agentResource"). */
  modelName?: string;
}

export class PrismaDataSource implements DataSource {
  readonly status: DataSourceStatus;
  private clientPromise: Promise<unknown> | null = null;
  private modelName: string;

  constructor(private readonly opts: PrismaOptions = {}) {
    this.modelName = opts.modelName ?? 'agentResource';
    const target = opts.datasourceUrl
      ? safeMaskUrl(opts.datasourceUrl)
      : process.env.DATABASE_URL
        ? safeMaskUrl(process.env.DATABASE_URL)
        : '<unset DATABASE_URL>';
    this.status = {
      kind: 'prisma',
      label: 'Prisma',
      detail: target,
    };
  }

  async connect(): Promise<void> {
    await this.client();
  }

  async disconnect(): Promise<void> {
    if (!this.clientPromise) return;
    const c = (await this.clientPromise) as { $disconnect?: () => Promise<void> };
    if (typeof c.$disconnect === 'function') await c.$disconnect();
  }

  private async client(): Promise<Record<string, AnyModel>> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        if (this.opts.client) return this.opts.client;
        // Dynamic import — never seen by the bundler if @prisma/client isn't
        // installed. This is what keeps `pg`/`@prisma/client` out of the
        // build graph for users on the in-memory adapter.
        const mod = (await import(
          /* webpackIgnore: true */
          '@prisma/client'
        )) as { PrismaClient: new (cfg?: unknown) => unknown };
        return new mod.PrismaClient(
          this.opts.datasourceUrl ? { datasourceUrl: this.opts.datasourceUrl } : undefined,
        );
      })();
    }
    return this.clientPromise as Promise<Record<string, AnyModel>>;
  }

  private async model(): Promise<AnyModel> {
    const client = await this.client();
    const model = client[this.modelName];
    if (!model) {
      throw new Error(
        `PrismaClient is missing model "${this.modelName}". Add the AgentResource model to packages/database/prisma/schema.prisma and re-run \`pnpm --filter @curex24/database db:generate\`.`,
      );
    }
    return model;
  }

  async get<T>(ctx: TenantContext, type: string, id: string): Promise<Resource<T> | null> {
    const m = await this.model();
    const row = await m.findUnique({
      where: { tenantId_type_id: { tenantId: ctx.tenant.id, type, id } },
    });
    return row ? (rowToResource<T>(row)) : null;
  }

  async list<T>(
    ctx: TenantContext,
    type: string,
    opts: ListOptions = {},
  ): Promise<ListResult<T>> {
    const m = await this.model();
    const rows = (await m.findMany({
      where: { tenantId: ctx.tenant.id, type },
      take: opts.limit,
      orderBy: { updatedAt: 'desc' },
    })) as PrismaRow[];
    let items = rows.map((r) => rowToResource<T>(r));
    if (opts.where) {
      items = items.filter((r) =>
        Object.entries(opts.where!).every(
          ([k, v]) => (r.data as Record<string, unknown>)[k] === v,
        ),
      );
    }
    return { items };
  }

  async create<T>(
    ctx: TenantContext,
    type: string,
    data: T,
    id?: string,
  ): Promise<Resource<T>> {
    const m = await this.model();
    const generatedId = id ?? generateResourceId(type);
    const row = await m.create({
      data: {
        id: generatedId,
        tenantId: ctx.tenant.id,
        type,
        data: data as object,
      },
    });
    return rowToResource<T>(row);
  }

  async update<T>(
    ctx: TenantContext,
    type: string,
    id: string,
    patch: Partial<T>,
  ): Promise<Resource<T> | null> {
    const existing = await this.get<T>(ctx, type, id);
    if (!existing) return null;
    const m = await this.model();
    const merged = { ...(existing.data as object), ...(patch as object) } as T;
    const row = await m.update({
      where: { tenantId_type_id: { tenantId: ctx.tenant.id, type, id } },
      data: { data: merged as object, version: { increment: 1 } },
    });
    return rowToResource<T>(row);
  }

  async delete(ctx: TenantContext, type: string, id: string): Promise<boolean> {
    const m = await this.model();
    try {
      await m.delete({
        where: { tenantId_type_id: { tenantId: ctx.tenant.id, type, id } },
      });
      return true;
    } catch {
      return false;
    }
  }

  async getSingleton<T>(ctx: TenantContext, type: string): Promise<T | null> {
    const r = await this.get<T>(ctx, type, SINGLETON_ID);
    return r?.data ?? null;
  }

  async putSingleton<T>(ctx: TenantContext, type: string, data: T): Promise<T> {
    const m = await this.model();
    const row = await m.upsert({
      where: { tenantId_type_id: { tenantId: ctx.tenant.id, type, id: SINGLETON_ID } },
      create: { id: SINGLETON_ID, tenantId: ctx.tenant.id, type, data: data as object },
      update: { data: data as object, version: { increment: 1 } },
    });
    return (rowToResource<T>(row).data) as T;
  }
}

// ─── Internal helpers ───────────────────────────────────────────────────────

interface PrismaRow {
  id: string;
  tenantId: string;
  type: string;
  data: unknown;
  version?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

interface AnyModel {
  findUnique: (args: unknown) => Promise<PrismaRow | null>;
  findMany: (args: unknown) => Promise<PrismaRow[]>;
  create: (args: unknown) => Promise<PrismaRow>;
  update: (args: unknown) => Promise<PrismaRow>;
  upsert: (args: unknown) => Promise<PrismaRow>;
  delete: (args: unknown) => Promise<PrismaRow>;
}

function rowToResource<T>(row: PrismaRow): Resource<T> {
  return {
    id: row.id,
    tenantId: row.tenantId,
    type: row.type,
    data: row.data as T,
    version: row.version,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
  };
}

function safeMaskUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    if (u.username && u.username !== '') u.username = u.username.slice(0, 1) + '***';
    return u.toString();
  } catch {
    return '<invalid DATABASE_URL>';
  }
}

/**
 * Generate a collision-resistant resource id. Uses Web Crypto's
 * `randomUUID()` when available (Node 19+, modern browsers, edge runtimes)
 * and falls back to a `crypto.randomBytes` hex string. We never use
 * `Math.random()` since these ids are persisted and may end up in URLs.
 */
function generateResourceId(type: string): string {
  const prefix = type.slice(0, 4);
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c && typeof c.randomUUID === 'function') {
    return `${prefix}_${c.randomUUID()}`;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const nodeCrypto = require('node:crypto') as { randomUUID?: () => string };
  if (typeof nodeCrypto.randomUUID === 'function') {
    return `${prefix}_${nodeCrypto.randomUUID()}`;
  }
  throw new Error('No secure random source available for id generation.');
}

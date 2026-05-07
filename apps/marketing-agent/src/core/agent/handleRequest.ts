/**
 * Transport-agnostic request handler.
 *
 * Every delivery surface (Next.js route, Express, Fastify, Cloudflare
 * Worker, Slack bot, CLI, …) wraps this function:
 *
 *   const { status, body } = await handleRequest({
 *     method: req.method,
 *     path:   url.pathname,
 *     query:  Object.fromEntries(url.searchParams),
 *     body:   await req.json().catch(() => null),
 *     ctx:    await auth.authorize(req).then((r) => r.context),
 *     deps,
 *   });
 *
 * URL surface (anchored under whichever prefix the host mounts it at):
 *
 *   GET    /resources/:type
 *   POST   /resources/:type
 *   GET    /resources/:type/:id
 *   PATCH  /resources/:type/:id
 *   PUT    /resources/:type/:id
 *   DELETE /resources/:type/:id
 *   GET    /singletons/:type
 *   PUT    /singletons/:type
 *   GET    /pack
 *   GET    /pack/skills
 *   GET    /tenant
 *   GET    /status
 *
 * No Next.js, no React, no Node-specific globals — fits on any runtime that
 * has `fetch`-style primitives.
 */

import type { DataSource } from '../dataSource/types';
import type { DomainPack } from '../domainPack/types';
import type { TenantContext } from '../tenant/types';

export interface AgentDeps {
  dataSource: DataSource;
  domainPack: DomainPack;
}

export interface AgentRequest {
  method: string;
  /** URL path WITHOUT host. Leading "/agent/v1" or similar is stripped by the host wrapper. */
  path: string;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
  ctx: TenantContext;
  deps: AgentDeps;
}

export interface AgentResponse<T = unknown> {
  status: number;
  body: T;
  headers?: Record<string, string>;
}

const ok = <T>(body: T, status = 200): AgentResponse<T> => ({ status, body });
const notFound = (msg = 'Not found') => ok({ error: msg }, 404);
const methodNotAllowed = () => ok({ error: 'Method not allowed' }, 405);
const badRequest = (msg: string) => ok({ error: msg }, 400);

export async function handleRequest(req: AgentRequest): Promise<AgentResponse> {
  const segments = req.path.split('/').filter(Boolean);
  if (segments.length === 0) return ok({ status: req.deps.dataSource.status });

  const [root, a, b] = segments;

  // ── Resources (collection + item) ─────────────────────────────────────
  if (root === 'resources' && a) {
    const type = a;
    if (!isAllowedType(req.deps.domainPack, type)) return notFound(`Unknown resource type: ${type}`);
    if (!b) return resourcesCollection(req, type);
    return resourcesItem(req, type, b);
  }

  // ── Singletons ────────────────────────────────────────────────────────
  if (root === 'singletons' && a) {
    if (!isAllowedSingleton(req.deps.domainPack, a)) return notFound(`Unknown singleton: ${a}`);
    if (req.method === 'GET') {
      const v = await req.deps.dataSource.getSingleton(req.ctx, a);
      return ok(v ?? {});
    }
    if (req.method === 'PUT') {
      const v = await req.deps.dataSource.putSingleton(req.ctx, a, asObject(req.body));
      return ok(v);
    }
    return methodNotAllowed();
  }

  // ── Domain pack metadata ──────────────────────────────────────────────
  if (root === 'pack') {
    if (a === 'skills') return ok(req.deps.domainPack.skills);
    if (a === 'kpis') return ok(req.deps.domainPack.kpis);
    if (a === 'resources') return ok(req.deps.domainPack.resources);
    if (a === 'intake') return ok(req.deps.domainPack.intakeQuestions);
    if (a === 'terminology') return ok(req.deps.domainPack.terminology);
    if (!a) {
      // Pack metadata WITHOUT the seed payload (which can be large).
      const { seedData, seedSingletons, ...rest } = req.deps.domainPack;
      void seedData;
      void seedSingletons;
      return ok(rest);
    }
    return notFound();
  }

  if (root === 'tenant') return ok(req.ctx.tenant);

  if (root === 'status') {
    return ok({
      dataSource: req.deps.dataSource.status,
      pack: { id: req.deps.domainPack.id, version: req.deps.domainPack.version },
      tenant: req.ctx.tenant.id,
    });
  }

  return notFound();
}

// ─── Resource handlers ──────────────────────────────────────────────────────

async function resourcesCollection(req: AgentRequest, type: string): Promise<AgentResponse> {
  if (req.method === 'GET') {
    const limit = num(req.query?.limit);
    const cursor = str(req.query?.cursor);
    const orderBy = str(req.query?.orderBy);
    const where = parseJsonQuery(req.query?.where);
    const list = await req.deps.dataSource.list(req.ctx, type, { limit, cursor, orderBy, where });
    return ok(list);
  }
  if (req.method === 'POST') {
    const body = asObject(req.body);
    const id = typeof body.id === 'string' ? body.id : undefined;
    const data = (body.data ?? body) as Record<string, unknown>;
    const created = await req.deps.dataSource.create(req.ctx, type, data, id);
    return ok(created, 201);
  }
  return methodNotAllowed();
}

async function resourcesItem(req: AgentRequest, type: string, id: string): Promise<AgentResponse> {
  if (req.method === 'GET') {
    const got = await req.deps.dataSource.get(req.ctx, type, id);
    return got ? ok(got) : notFound();
  }
  if (req.method === 'PUT' || req.method === 'PATCH') {
    const updated = await req.deps.dataSource.update(req.ctx, type, id, asObject(req.body));
    return updated ? ok(updated) : notFound();
  }
  if (req.method === 'DELETE') {
    const removed = await req.deps.dataSource.delete(req.ctx, type, id);
    return removed ? ok({ ok: true }) : notFound();
  }
  return methodNotAllowed();
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isAllowedType(pack: DomainPack, type: string): boolean {
  return pack.resources.some((r) => r.id === type && !r.singleton);
}

function isAllowedSingleton(pack: DomainPack, type: string): boolean {
  return pack.resources.some((r) => r.id === type && r.singleton === true);
}

function asObject(body: unknown): Record<string, unknown> {
  if (body == null) return {};
  if (typeof body === 'object' && !Array.isArray(body)) return body as Record<string, unknown>;
  throw Object.assign(new Error('Request body must be a JSON object'), { status: 400 });
}

function num(v: unknown): number | undefined {
  if (Array.isArray(v)) v = v[0];
  const n = typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

function str(v: unknown): string | undefined {
  if (Array.isArray(v)) v = v[0];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function parseJsonQuery(v: unknown): Record<string, unknown> | undefined {
  const s = str(v);
  if (!s) return undefined;
  try {
    const parsed = JSON.parse(s);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

export { ok, notFound, methodNotAllowed, badRequest };

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Self-contained backend for the marketing-agent app.
 *
 * Catch-all route handler that backs every `/api/backend/*` call when no
 * external API is configured (i.e. `NEXT_PUBLIC_API_URL` is unset).
 * Reads & mutates the in-memory store in `lib/server/mockStore.ts`.
 *
 * When `NEXT_PUBLIC_API_URL` is set, `next.config.js` rewrites these paths
 * to the external API and this handler is never hit.
 */

import { NextRequest, NextResponse } from 'next/server';
import { nextId, store } from '@/lib/server/mockStore';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ path?: string[] }> };

const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
const notFound = () => json({ error: 'Not found' }, 404);

async function readJson(req: NextRequest): Promise<any> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function makeFakeJwt(payload: Record<string, unknown>): string {
  // A purely structural JWT (header.payload.signature) — accepted by the
  // `isValidJwtStructure` middleware check. NOT cryptographically signed;
  // self-contained mode does not perform real auth.
  const enc = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=+$/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  const header = enc({ alg: 'none', typ: 'JWT' });
  const body = enc({ ...payload, iat: Math.floor(Date.now() / 1000) });
  return `${header}.${body}.local-mock`;
}

// ─── Handlers per resource ───────────────────────────────────────────────────

async function handleProfile(req: NextRequest) {
  if (req.method === 'GET') return json(store.profile);
  if (req.method === 'PUT') {
    const patch = await readJson(req);
    store.profile = { ...store.profile, ...patch };
    return json(store.profile);
  }
  return notFound();
}

async function handleCollection<T extends { id: string }>(
  req: NextRequest,
  list: T[],
  prefix: string,
  id: string | undefined,
): Promise<NextResponse> {
  // Collection: /resource
  if (!id) {
    if (req.method === 'GET') return json(list);
    if (req.method === 'POST') {
      const body = await readJson(req);
      const item = { ...body, id: nextId(prefix) } as T;
      list.push(item);
      return json(item, 201);
    }
    return notFound();
  }
  // Item: /resource/:id
  const idx = list.findIndex((x) => x.id === id);
  if (idx === -1) return notFound();
  if (req.method === 'GET') return json(list[idx]);
  if (req.method === 'PUT' || req.method === 'PATCH') {
    const patch = await readJson(req);
    list[idx] = { ...list[idx], ...patch, id: list[idx].id };
    return json(list[idx]);
  }
  if (req.method === 'DELETE') {
    list.splice(idx, 1);
    return json({ ok: true });
  }
  return notFound();
}

async function handleIntake(req: NextRequest) {
  if (req.method === 'GET') return json(store.intakeResponses);
  if (req.method === 'PUT') {
    const body = await readJson(req);
    store.intakeResponses = { ...store.intakeResponses, ...body };
    return json(store.intakeResponses);
  }
  return notFound();
}

async function handleAuthLogin(req: NextRequest) {
  if (req.method !== 'POST') return notFound();
  const { email = 'admin@example.com' } = await readJson(req);
  return json({
    token: makeFakeJwt({ sub: email, role: 'marketing-admin' }),
    user: { email, role: 'marketing-admin' },
  });
}

// ─── Router ──────────────────────────────────────────────────────────────────

async function route(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { path = [] } = await ctx.params;
  const [root, ...rest] = path;

  if (root === 'auth') {
    const [sub] = rest;
    if (sub === 'marketing-login') return handleAuthLogin(req);
    return notFound();
  }

  if (root === 'marketing') {
    const [resource, idOrSub, sub2] = rest;

    if (resource === 'profile') return handleProfile(req);
    if (resource === 'intake-responses') return handleIntake(req);

    if (resource === 'campaigns')
      return handleCollection(req, store.campaigns, 'cmp', idOrSub);
    if (resource === 'experiments')
      return handleCollection(req, store.experiments, 'exp', idOrSub);
    if (resource === 'content-calendar')
      return handleCollection(req, store.contentItems, 'ci', idOrSub);
    if (resource === 'lifecycle-flows')
      return handleCollection(req, store.lifecycleFlows, 'lf', idOrSub);
    if (resource === 'plan-items')
      return handleCollection(req, store.planItems, 'pi', idOrSub);

    if (resource === 'seo' && idOrSub === 'pages')
      return handleCollection(req, store.seoPages, 'sp', sub2);
    if (resource === 'seo' && idOrSub === 'keyword-clusters')
      return handleCollection(req, store.keywordClusters, 'kc', sub2);

    if (resource === 'kpis') {
      if (req.method !== 'GET') return notFound();
      const key = idOrSub as keyof typeof store.kpis;
      const list = store.kpis[key];
      if (!list) return notFound();
      return json(list);
    }
  }

  return notFound();
}

export const GET = route;
export const POST = route;
export const PUT = route;
export const PATCH = route;
export const DELETE = route;

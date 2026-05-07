/**
 * Self-contained backend for the marketing-agent app.
 *
 * Catch-all route handler that backs every `/api/backend/*` call when no
 * external API is configured (i.e. `NEXT_PUBLIC_API_URL` is unset).
 *
 * Reads & writes go through the active `DataSource` returned by
 * `getActiveDataSource()`, which is always an in-memory `MockDataSource`.
 *
 * When `NEXT_PUBLIC_API_URL` is set, `next.config.js` rewrites these paths
 * to the external API and this handler is never hit.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { getActiveDataSource } from '@/lib/server/dataSource';
import type { KpiCategory } from '@/lib/server/dataSource/types';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ path?: string[] }> };

const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
const notFound = () => json({ error: 'Not found' }, 404);
const methodNotAllowed = () => json({ error: 'Method not allowed' }, 405);

async function readJson(req: NextRequest): Promise<any> {
  try { return await req.json(); } catch { return {}; }
}

function makeFakeJwt(payload: Record<string, unknown>): string {
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

// ─── Resource handlers ──────────────────────────────────────────────────────

async function handleProfile(req: NextRequest) {
  const ds = getActiveDataSource();
  if (req.method === 'GET') return json(await ds.getProfile());
  if (req.method === 'PUT') return json(await ds.updateProfile(await readJson(req)));
  return methodNotAllowed();
}

async function handleIntake(req: NextRequest) {
  const ds = getActiveDataSource();
  if (req.method === 'GET') return json(await ds.getIntakeResponses());
  if (req.method === 'PUT') return json(await ds.putIntakeResponses(await readJson(req)));
  return methodNotAllowed();
}

interface CollectionAdapter<T> {
  list(): Promise<T[]>;
  create(input: any): Promise<T>;
  update(id: string, patch: any): Promise<T | null>;
  remove(id: string): Promise<boolean>;
}

async function handleCollection<T extends { id: string }>(
  req: NextRequest,
  ad: CollectionAdapter<T>,
  id: string | undefined,
): Promise<NextResponse> {
  if (!id) {
    if (req.method === 'GET') return json(await ad.list());
    if (req.method === 'POST') return json(await ad.create(await readJson(req)), 201);
    return methodNotAllowed();
  }
  if (req.method === 'GET') {
    const list = await ad.list();
    const item = list.find((x) => x.id === id);
    return item ? json(item) : notFound();
  }
  if (req.method === 'PUT' || req.method === 'PATCH') {
    const updated = await ad.update(id, await readJson(req));
    return updated ? json(updated) : notFound();
  }
  if (req.method === 'DELETE') {
    const ok = await ad.remove(id);
    return ok ? json({ ok: true }) : notFound();
  }
  return methodNotAllowed();
}

async function handleAuthLogin(req: NextRequest) {
  if (req.method !== 'POST') return methodNotAllowed();
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
    const ds = getActiveDataSource();
    const [resource, idOrSub, sub2] = rest;

    if (resource === 'profile') return handleProfile(req);
    if (resource === 'intake-responses') return handleIntake(req);

    if (resource === 'campaigns')
      return handleCollection(req, {
        list: () => ds.listCampaigns(),
        create: (i) => ds.createCampaign(i),
        update: (id, p) => ds.updateCampaign(id, p),
        remove: (id) => ds.deleteCampaign(id),
      }, idOrSub);

    if (resource === 'experiments')
      return handleCollection(req, {
        list: () => ds.listExperiments(),
        create: (i) => ds.createExperiment(i),
        update: (id, p) => ds.updateExperiment(id, p),
        remove: (id) => ds.deleteExperiment(id),
      }, idOrSub);

    if (resource === 'content-calendar')
      return handleCollection(req, {
        list: () => ds.listContentItems(),
        create: (i) => ds.createContentItem(i),
        update: (id, p) => ds.updateContentItem(id, p),
        remove: (id) => ds.deleteContentItem(id),
      }, idOrSub);

    if (resource === 'lifecycle-flows')
      return handleCollection(req, {
        list: () => ds.listLifecycleFlows(),
        create: (i) => ds.createLifecycleFlow(i),
        update: (id, p) => ds.updateLifecycleFlow(id, p),
        remove: (id) => ds.deleteLifecycleFlow(id),
      }, idOrSub);

    if (resource === 'plan-items')
      return handleCollection(req, {
        list: () => ds.listPlanItems(),
        create: (i) => ds.createPlanItem(i),
        update: (id, p) => ds.updatePlanItem(id, p),
        remove: (id) => ds.deletePlanItem(id),
      }, idOrSub);

    if (resource === 'seo' && idOrSub === 'pages')
      return handleCollection(req, {
        list: () => ds.listSeoPages(),
        create: (i) => ds.createSeoPage(i),
        update: (id, p) => ds.updateSeoPage(id, p),
        remove: (id) => ds.deleteSeoPage(id),
      }, sub2);

    if (resource === 'seo' && idOrSub === 'keyword-clusters')
      return handleCollection(req, {
        list: () => ds.listKeywordClusters(),
        create: (i) => ds.createKeywordCluster(i),
        update: (id, p) => ds.updateKeywordCluster(id, p),
        remove: (id) => ds.deleteKeywordCluster(id),
      }, sub2);

    if (resource === 'kpis') {
      if (req.method !== 'GET') return methodNotAllowed();
      const list = await ds.listKpis(idOrSub as KpiCategory);
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

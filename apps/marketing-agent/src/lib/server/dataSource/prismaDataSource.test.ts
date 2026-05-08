/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * Unit tests for `PrismaDataSource` against a stubbed Prisma client.
 *
 * Run via `pnpm --filter @curex24/marketing-agent test:datasource` (which
 * invokes ts-node + node:test). The test injects a fake client through
 * the constructor's `client` option so we never touch a real database.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { PrismaDataSource } from './prismaDataSource';

interface Row {
  id: string;
  [k: string]: unknown;
}

/** Minimal in-memory Prisma client stub covering the methods we call. */
function makeStubClient() {
  const tables: Record<string, Row[]> = {
    marketingBusinessProfile: [],
    marketingCampaign: [],
    marketingExperiment: [],
    marketingContentItem: [],
    marketingSeoPage: [],
    marketingKeywordCluster: [],
    marketingLifecycleFlow: [],
    marketingLifecycleStep: [],
    marketingPlanItem: [],
    marketingIntakeResponse: [],
  };
  let idCounter = 0;
  const nextId = () => `id_${++idCounter}`;
  const matches = (row: Row, where: Record<string, unknown>) =>
    Object.entries(where).every(([k, v]) => row[k] === v);

  function model(name: string, opts: { include?: string[] } = {}) {
    const list = tables[name];
    const enrich = (row: Row, include?: Record<string, unknown>) => {
      if (!opts.include || !row) return row;
      const out: Row = { ...row };
      if (include) {
        for (const key of Object.keys(include)) {
          if (key === 'steps' && name === 'marketingLifecycleFlow') {
            out.steps = tables.marketingLifecycleStep
              .filter((s) => s.flowId === row.id)
              .sort((a, b) => Number(a.order) - Number(b.order));
          }
        }
      }
      return out;
    };
    return {
      findUnique: async ({ where }: { where: Record<string, unknown> }) => {
        const row = list.find((r) => matches(r, where));
        return row ?? null;
      },
      findMany: async (args: { include?: Record<string, unknown> } = {}) => {
        return list.map((r) => enrich(r, args.include));
      },
      create: async ({ data, include }: { data: Record<string, unknown>; include?: Record<string, unknown> }) => {
        const row: Row = { id: (data.id as string) ?? nextId(), ...data };
        // Strip nested `steps.create` writes for lifecycle flows; persist
        // them in the steps table instead.
        if (name === 'marketingLifecycleFlow' && (data.steps as any)?.create) {
          const stepInputs = (data.steps as any).create as Array<Record<string, unknown>>;
          delete row.steps;
          list.push(row);
          for (const s of stepInputs) {
            tables.marketingLifecycleStep.push({ id: nextId(), flowId: row.id, ...s });
          }
        } else {
          list.push(row);
        }
        return enrich(row, include);
      },
      update: async ({ where, data, include }: { where: Record<string, unknown>; data: Record<string, unknown>; include?: Record<string, unknown> }) => {
        const idx = list.findIndex((r) => matches(r, where));
        if (idx === -1) throw new Error('not found');
        // Lifecycle flow nested replace
        if (name === 'marketingLifecycleFlow' && (data.steps as any)) {
          const ops = data.steps as { deleteMany?: object; create?: Array<Record<string, unknown>> };
          if (ops.deleteMany) {
            tables.marketingLifecycleStep = tables.marketingLifecycleStep.filter(
              (s) => s.flowId !== list[idx].id,
            );
          }
          if (ops.create) {
            for (const s of ops.create) {
              tables.marketingLifecycleStep.push({ id: nextId(), flowId: list[idx].id, ...s });
            }
          }
          const { steps: _ignored, ...rest } = data;
          list[idx] = { ...list[idx], ...rest };
        } else {
          list[idx] = { ...list[idx], ...data };
        }
        return enrich(list[idx], include);
      },
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: Record<string, unknown>;
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => {
        const idx = list.findIndex((r) => matches(r, where));
        if (idx === -1) {
          const row: Row = { id: (create.id as string) ?? nextId(), ...create };
          list.push(row);
          return row;
        }
        list[idx] = { ...list[idx], ...update };
        return list[idx];
      },
      delete: async ({ where }: { where: Record<string, unknown> }) => {
        const idx = list.findIndex((r) => matches(r, where));
        if (idx === -1) throw new Error('not found');
        const [removed] = list.splice(idx, 1);
        return removed;
      },
    };
  }

  return {
    marketingBusinessProfile: model('marketingBusinessProfile'),
    marketingCampaign: model('marketingCampaign'),
    marketingExperiment: model('marketingExperiment'),
    marketingContentItem: model('marketingContentItem'),
    marketingSeoPage: model('marketingSeoPage'),
    marketingKeywordCluster: model('marketingKeywordCluster'),
    marketingLifecycleFlow: model('marketingLifecycleFlow', { include: ['steps'] }),
    marketingPlanItem: model('marketingPlanItem'),
    marketingIntakeResponse: model('marketingIntakeResponse'),
    _tables: tables,
  };
}

function makeDs() {
  const client = makeStubClient();
  const ds = new PrismaDataSource({ client });
  return { ds, client };
}

test('status reports prisma kind with masked URL', () => {
  const { ds } = makeDs();
  assert.equal(ds.status.kind, 'prisma');
  assert.match(ds.status.label, /Prisma/);
});

test('getProfile returns empty profile when no row exists', async () => {
  const { ds } = makeDs();
  const profile = await ds.getProfile();
  assert.equal(profile.monthlyBudget, 0);
  assert.deepEqual(profile.targetCities, []);
});

test('updateProfile upserts and roundtrips through getProfile', async () => {
  const { ds } = makeDs();
  await ds.updateProfile({
    monthlyBudget: 500_000,
    targetCities: ['Mumbai', 'Delhi'],
    topMemberPersona: 'Urban professional',
    competitors: ['A', 'B'],
  });
  const profile = await ds.getProfile();
  assert.equal(profile.monthlyBudget, 500_000);
  assert.deepEqual(profile.targetCities, ['Mumbai', 'Delhi']);
  assert.equal(profile.topMemberPersona, 'Urban professional');
});

test('campaigns: create / list / update / delete', async () => {
  const { ds } = makeDs();
  const created = await ds.createCampaign({
    name: 'C1',
    objective: 'awareness',
    channel: 'meta',
    audience: 'urban',
    budget: '₹1L',
    duration: '4w',
    kpi: 'CTR',
    status: 'active',
    headline: ['h1'],
    description: ['d1'],
  });
  assert.ok(created.id);
  const listed = await ds.listCampaigns();
  assert.equal(listed.length, 1);
  const updated = await ds.updateCampaign(created.id, { status: 'paused' });
  assert.equal(updated?.status, 'paused');
  const removed = await ds.deleteCampaign(created.id);
  assert.equal(removed, true);
  const after = await ds.listCampaigns();
  assert.equal(after.length, 0);
  assert.equal(await ds.deleteCampaign('does-not-exist'), false);
});

test('experiments: create / list / update / delete', async () => {
  const { ds } = makeDs();
  const created = await ds.createExperiment({
    name: 'E1', hypothesis: 'h', channel: 'web',
    control: 'c', variant: 'v', metric: 'ctr',
    startDate: '2026-01-01', endDate: '2026-02-01',
    status: 'running',
  });
  assert.ok(created.id);
  assert.equal((await ds.listExperiments()).length, 1);
  const updated = await ds.updateExperiment(created.id, { winner: 'variant', status: 'completed' });
  assert.equal(updated?.winner, 'variant');
  assert.equal(await ds.deleteExperiment(created.id), true);
});

test('content items: create / list / update / delete', async () => {
  const { ds } = makeDs();
  const created = await ds.createContentItem({
    week: 1, day: 'Mon', platform: 'IG', pillar: 'budgeting',
    title: 'T', format: 'Reel', status: 'planned',
  });
  const listed = await ds.listContentItems();
  assert.equal(listed.length, 1);
  const updated = await ds.updateContentItem(created.id, { status: 'published' });
  assert.equal(updated?.status, 'published');
  assert.equal(await ds.deleteContentItem(created.id), true);
});

test('seo pages: create / list / update / delete', async () => {
  const { ds } = makeDs();
  const created = await ds.createSeoPage({
    url: '/x', type: 'landing', title: 'X', status: 'planned', targetKeyword: 'x',
  });
  assert.equal((await ds.listSeoPages()).length, 1);
  const updated = await ds.updateSeoPage(created.id, { status: 'live' });
  assert.equal(updated?.status, 'live');
  assert.equal(await ds.deleteSeoPage(created.id), true);
});

test('keyword clusters: create / list / update / delete', async () => {
  const { ds } = makeDs();
  const created = await ds.createKeywordCluster({
    cluster: 'brand', type: 'transactional', priority: 'high',
    keywords: [{ keyword: 'k', volume: '1k', difficulty: 'low' }],
  });
  assert.equal((await ds.listKeywordClusters()).length, 1);
  const updated = await ds.updateKeywordCluster(created.id, { priority: 'medium' });
  assert.equal(updated?.priority, 'medium');
  assert.equal(await ds.deleteKeywordCluster(created.id), true);
});

test('lifecycle flows: create with nested steps and replace on update', async () => {
  const { ds } = makeDs();
  const created = await ds.createLifecycleFlow({
    name: 'Onboard', segment: 'member', trigger: 'signup', status: 'active',
    steps: [
      { day: 0, channel: 'email', message: 'welcome', goal: 'activate' },
      { day: 3, channel: 'sms', message: 'nudge', goal: 'engage' },
    ],
  });
  assert.equal(created.steps.length, 2);
  const listed = await ds.listLifecycleFlows();
  assert.equal(listed[0].steps.length, 2);
  const updated = await ds.updateLifecycleFlow(created.id, {
    status: 'paused',
    steps: [{ day: 0, channel: 'push', message: 'hi', goal: 'open' }],
  });
  assert.equal(updated?.status, 'paused');
  assert.equal(updated?.steps.length, 1);
  assert.equal(updated?.steps[0].channel, 'push');
  assert.equal(await ds.deleteLifecycleFlow(created.id), true);
});

test('plan items: create / list / update / delete', async () => {
  const { ds } = makeDs();
  const created = await ds.createPlanItem({
    phase: '1-30', category: 'Brand', task: 'Ship homepage', owner: 'Marketing', done: false,
  });
  assert.equal((await ds.listPlanItems()).length, 1);
  const updated = await ds.updatePlanItem(created.id, { done: true });
  assert.equal(updated?.done, true);
  assert.equal(await ds.deletePlanItem(created.id), true);
});

test('intake responses: putIntakeResponses upserts each questionId', async () => {
  const { ds } = makeDs();
  await ds.putIntakeResponses({ q1: 'a', q2: 42 });
  let res = await ds.getIntakeResponses();
  assert.equal(res.q1, 'a');
  assert.equal(res.q2, 42);
  await ds.putIntakeResponses({ q1: 'b' });
  res = await ds.getIntakeResponses();
  assert.equal(res.q1, 'b');
  assert.equal(res.q2, 42);
});

test('listKpis returns empty array (no Prisma model yet)', async () => {
  const { ds } = makeDs();
  for (const cat of ['north-star', 'acquisition', 'activation', 'retention'] as const) {
    assert.deepEqual(await ds.listKpis(cat), []);
  }
});

test('update returns null for unknown id', async () => {
  const { ds } = makeDs();
  assert.equal(await ds.updateCampaign('nope', { status: 'paused' }), null);
  assert.equal(await ds.updateExperiment('nope', {}), null);
  assert.equal(await ds.updateContentItem('nope', {}), null);
  assert.equal(await ds.updateSeoPage('nope', {}), null);
  assert.equal(await ds.updateKeywordCluster('nope', {}), null);
  assert.equal(await ds.updateLifecycleFlow('nope', {}), null);
  assert.equal(await ds.updatePlanItem('nope', {}), null);
});

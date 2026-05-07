/**
 * Reusable contract test for `DataSource` adapters.
 *
 * Pass any adapter (memory, prisma, mongo, rest, …) and this function will
 * exercise the full surface and `throw` on the first failure. Wire it into
 * whichever test runner the platform uses (Playwright `test()`, Jest,
 * Node's `--test`, Deno test, …) — it's framework-free.
 *
 * Usage:
 *   import { runDataSourceContract } from '@/core/dataSource/contract';
 *   await runDataSourceContract(new MemoryDataSource());
 */

import type { DataSource } from './types';
import type { TenantContext } from '../tenant/types';

const ctx = (id: string): TenantContext => ({
  tenant: { id, name: id, domainPackId: 'test' },
});

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`DataSource contract failed: ${msg}`);
}

function eq(a: unknown, b: unknown, msg: string): void {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(`DataSource contract failed: ${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
  }
}

export interface ContractOptions {
  /** Override the resource type used by the test (default: `__contract`). */
  type?: string;
  /** Override tenants used by the isolation test. */
  tenants?: [string, string];
}

export async function runDataSourceContract(
  ds: DataSource,
  opts: ContractOptions = {},
): Promise<void> {
  const type = opts.type ?? '__contract';
  const [t1, t2] = opts.tenants ?? ['__t1', '__t2'];

  // Clean slate.
  for (const t of [t1, t2]) {
    const before = await ds.list(ctx(t), type);
    for (const r of before.items) await ds.delete(ctx(t), type, r.id);
  }

  // create + get
  const created = await ds.create(ctx(t1), type, { name: 'alpha', n: 1 });
  assert(created.id, 'created.id must be set');
  assert(created.tenantId === t1, 'created.tenantId must match');
  assert(created.type === type, 'created.type must match');
  const got = await ds.get(ctx(t1), type, created.id);
  eq(got?.data, { name: 'alpha', n: 1 }, 'get returns the same data we wrote');

  // update
  const updated = await ds.update<{ name: string; n: number }>(ctx(t1), type, created.id, { n: 2 });
  eq(updated?.data, { name: 'alpha', n: 2 }, 'update merges patch into data');
  assert((updated?.version ?? 0) > (created.version ?? 0), 'update bumps version');

  // list
  const list = await ds.list(ctx(t1), type);
  assert(list.items.some((r) => r.id === created.id), 'list contains the created resource');

  // tenant isolation
  await ds.create(ctx(t2), type, { name: 'beta' });
  const t1List = await ds.list(ctx(t1), type);
  const t2List = await ds.list(ctx(t2), type);
  assert(
    t1List.items.every((r) => r.tenantId === t1) && t2List.items.every((r) => r.tenantId === t2),
    'tenant isolation: each tenant only sees its own rows',
  );

  // singletons
  await ds.putSingleton(ctx(t1), '__profile', { hello: 'world' });
  const sing = await ds.getSingleton<{ hello: string }>(ctx(t1), '__profile');
  eq(sing, { hello: 'world' }, 'singleton round-trip');

  // delete
  const removed = await ds.delete(ctx(t1), type, created.id);
  assert(removed, 'delete returns true for existing rows');
  const reGet = await ds.get(ctx(t1), type, created.id);
  assert(reGet === null, 'deleted rows return null on get');

  // missing → null / false
  assert(
    (await ds.delete(ctx(t1), type, 'nope')) === false,
    'delete returns false for missing rows',
  );
  assert(
    (await ds.update(ctx(t1), type, 'nope', { n: 9 })) === null,
    'update returns null for missing rows',
  );

  // cleanup
  for (const t of [t1, t2]) {
    const all = await ds.list(ctx(t), type);
    for (const r of all.items) await ds.delete(ctx(t), type, r.id);
  }
}

/**
 * Minimal smoke test for any `AiProvider`. Doesn't assert on content (since
 * non-mock providers are non-deterministic) — just verifies the wiring.
 */
import type { AiProvider } from '../aiProvider/types';

export async function runAiProviderContract(provider: AiProvider): Promise<void> {
  if (!provider.capabilities.chat) throw new Error('provider must support chat');
  const reply = await provider.chat({
    system: 'You are a contract test. Reply with the word "ok".',
    messages: [{ role: 'user', content: 'ping' }],
    maxTokens: 16,
  });
  assert(typeof reply.reply === 'string', 'chat reply must be a string');
  assert(typeof reply.model === 'string' && reply.model.length > 0, 'chat reply must report a model');
}

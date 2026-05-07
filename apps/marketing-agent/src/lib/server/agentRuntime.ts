/**
 * Process-wide agent runtime singletons resolved from `agent.config.ts`.
 *
 * Route handlers + scripts call `getAgentRuntime()` to obtain the configured
 * `DataSource` + `AiProvider` + active `DomainPack` + `AuthAdapter`. Caches
 * for the life of the process so we don't reconnect to the DB on every
 * request; `resetAgentRuntime()` is exposed for tests + hot reloads.
 */

import {
  createAiProvider,
  createDataSource,
  getDomainPack,
  resetAiProviderCache,
  resetDataSourceCache,
  type AiProvider,
  type AuthAdapter,
  type DataSource,
  type DomainPack,
  type TenantContext,
} from '@/core';
import { getAgentConfig, resetAgentConfig } from '@/agent.config';

export interface AgentRuntime {
  dataSource: DataSource;
  aiProvider: AiProvider;
  domainPack: DomainPack;
  auth: AuthAdapter;
}

let cached: Promise<AgentRuntime> | null = null;

export function getAgentRuntime(): Promise<AgentRuntime> {
  if (!cached) {
    cached = (async () => {
      const config = getAgentConfig();
      const [dataSource, aiProvider] = await Promise.all([
        createDataSource(config.dataSource),
        createAiProvider(config.aiProvider),
      ]);
      const domainPack = getDomainPack(config.domainPackId);
      // Best-effort seed for the in-memory adapter so the UI shows demo
      // content out of the box. SQL/REST adapters seed via an explicit
      // migration script.
      if (dataSource.status.kind === 'mock' && domainPack.seedData) {
        await seedMemory(dataSource, domainPack, config.tenant.id);
      }
      return { dataSource, aiProvider, domainPack, auth: config.auth };
    })();
  }
  return cached;
}

export function resetAgentRuntime(): void {
  cached = null;
  resetAgentConfig();
  resetDataSourceCache();
  resetAiProviderCache();
}

async function seedMemory(
  ds: DataSource,
  pack: DomainPack,
  tenantId: string,
): Promise<void> {
  const ctx: TenantContext = {
    tenant: { id: tenantId, name: tenantId, domainPackId: pack.id },
  };
  for (const [type, items] of Object.entries(pack.seedData ?? {})) {
    const existing = await ds.list(ctx, type, { limit: 1 });
    if (existing.items.length > 0) continue;
    for (const item of items) {
      const obj = item as Record<string, unknown>;
      const id = typeof obj.id === 'string' ? obj.id : undefined;
      const { id: _ignored, ...data } = obj;
      void _ignored;
      await ds.create(ctx, type, data, id);
    }
  }
  for (const [type, value] of Object.entries(pack.seedSingletons ?? {})) {
    const existing = await ds.getSingleton(ctx, type);
    if (existing) continue;
    await ds.putSingleton(ctx, type, value as Record<string, unknown>);
  }
}

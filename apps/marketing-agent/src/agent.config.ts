/**
 * `agent.config.ts` — single source of truth for the agent runtime.
 *
 * Wires together:
 *   - tenant model (default single-tenant for zero-config dev)
 *   - active domain pack
 *   - data source (env-selected, dynamic-imported)
 *   - AI provider (env-selected, dynamic-imported)
 *   - auth adapter
 *
 * Defaults preserve today's behavior exactly: in-memory data, mock AI for
 * tests, anonymous auth, healthcare-clinic pack. Production deployments
 * override via env vars — no code changes required.
 *
 * Adding a new vertical = `import '@/packs/my-pack'` + set
 * `DOMAIN_PACK=my-pack`. Adding a new database = `DATA_SOURCE=prisma`
 * (and install `@prisma/client`). Adding a new AI provider = `AI_PROVIDER=openai`.
 */

import {
  AnonymousAuthAdapter,
  DEFAULT_TENANT,
  type AiProviderConfig,
  type AuthAdapter,
  type DataSourceConfig,
  type Tenant,
} from '@/core';

// Side-effect import to auto-register the bundled pack.
import '@/packs/healthcare-clinic';

const env = (key: string, fallback?: string): string | undefined => {
  const value = process.env[key];
  return value && value.length > 0 ? value : fallback;
};

export interface AgentConfig {
  tenant: Tenant;
  dataSource: DataSourceConfig;
  aiProvider: AiProviderConfig;
  auth: AuthAdapter;
  /** Domain pack id; must match a pack registered via `registerDomainPack()`. */
  domainPackId: string;
}

function resolveTenant(): Tenant {
  return {
    ...DEFAULT_TENANT,
    id: env('AGENT_TENANT_ID', DEFAULT_TENANT.id)!,
    name: env('AGENT_TENANT_NAME', DEFAULT_TENANT.name)!,
    domainPackId: env('DOMAIN_PACK', DEFAULT_TENANT.domainPackId)!,
    locale: env('AGENT_LOCALE', DEFAULT_TENANT.locale),
    currency: env('AGENT_CURRENCY', DEFAULT_TENANT.currency),
    timezone: env('AGENT_TIMEZONE', DEFAULT_TENANT.timezone),
  };
}

function resolveDataSource(): DataSourceConfig {
  const kind = (env('DATA_SOURCE', 'memory') ?? 'memory') as DataSourceConfig['kind'];
  switch (kind) {
    case 'prisma':
      return { kind, options: { datasourceUrl: process.env.DATABASE_URL } };
    case 'rest':
      return {
        kind,
        options: {
          baseUrl: env('AGENT_REST_BASE_URL', '') ?? '',
          token: env('AGENT_REST_TOKEN'),
        },
      };
    default:
      return { kind: 'memory' };
  }
}

function resolveAiProvider(): AiProviderConfig {
  const kind = (env('AI_PROVIDER', 'mock') ?? 'mock') as AiProviderConfig['kind'];
  return { kind, options: {} };
}

let cached: AgentConfig | null = null;

/** Resolve the runtime agent config (memoized). Override in tests via `setAgentConfig`. */
export function getAgentConfig(): AgentConfig {
  if (cached) return cached;
  const tenant = resolveTenant();
  cached = {
    tenant,
    domainPackId: tenant.domainPackId,
    dataSource: resolveDataSource(),
    aiProvider: resolveAiProvider(),
    auth: new AnonymousAuthAdapter(tenant),
  };
  return cached;
}

/** Test / advanced override: replace the cached config wholesale. */
export function setAgentConfig(config: AgentConfig): void {
  cached = config;
}

/** Test helper: clear cached config + adapter caches. */
export function resetAgentConfig(): void {
  cached = null;
}

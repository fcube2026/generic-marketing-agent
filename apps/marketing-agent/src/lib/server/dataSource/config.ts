/**
 * Persisted configuration for the marketing-agent data source.
 *
 * Stores:
 *  - `dsn`        — the user-supplied DB connection string, **encrypted** with
 *                   `MARKETING_AGENT_SECRET` via `crypto.ts`.
 *  - `dialect`    — currently always `postgres` (other dialects are stubbed
 *                   out behind the abstraction; future PRs can plug them in).
 *  - `mappings`   — per-resource `{ table, columns }` overrides. When a
 *                   resource has no mapping, the SQL data source falls back
 *                   to convention-based detection on first read.
 *
 * The file lives at `MARKETING_AGENT_CONFIG_DIR/datasource.json` (defaulting
 * to `<cwd>/.marketing-agent/`). It is *never* shipped to the browser; only
 * the redacted status is exposed via `/api/backend/datasource/status`.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { decryptSecret, encryptSecret } from './crypto';
import type { ResourceKey } from './types';

export type Dialect = 'postgres';

export interface ResourceMapping {
  /** Fully qualified or simple table name selected from the introspected schema. */
  table: string;
  /** Column overrides — keys are the UI field names, values are DB column names. */
  columns: Record<string, string>;
}

export interface DataSourceConfig {
  dialect: Dialect;
  /** Encrypted connection string. */
  encryptedDsn: string;
  /** Optional human label shown in the UI banner — defaults to host/database. */
  label?: string;
  /** Per-resource user overrides. Missing entries fall back to auto-detect. */
  mappings: Partial<Record<ResourceKey, ResourceMapping>>;
  updatedAt: string;
}

function configDir(): string {
  return process.env.MARKETING_AGENT_CONFIG_DIR || join(process.cwd(), '.marketing-agent');
}

function configPath(): string {
  return join(configDir(), 'datasource.json');
}

let cached: DataSourceConfig | null | undefined;

export function loadConfig(): DataSourceConfig | null {
  if (cached !== undefined) return cached;
  const path = configPath();
  if (!existsSync(path)) {
    cached = null;
    return null;
  }
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as DataSourceConfig;
    cached = raw;
    return raw;
  } catch {
    cached = null;
    return null;
  }
}

export function saveConfig(cfg: DataSourceConfig): void {
  const dir = configDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(configPath(), JSON.stringify(cfg, null, 2), { encoding: 'utf8', mode: 0o600 });
  cached = cfg;
}

export function clearConfig(): void {
  const path = configPath();
  if (existsSync(path)) {
    writeFileSync(path, '{}', { encoding: 'utf8', mode: 0o600 });
  }
  cached = null;
}

export function getDsn(cfg: DataSourceConfig): string {
  return decryptSecret(cfg.encryptedDsn);
}

export function buildConfig(input: {
  dialect: Dialect;
  dsn: string;
  label?: string;
  mappings?: Partial<Record<ResourceKey, ResourceMapping>>;
}): DataSourceConfig {
  return {
    dialect: input.dialect,
    encryptedDsn: encryptSecret(input.dsn),
    label: input.label,
    mappings: input.mappings ?? {},
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Returns a redacted summary safe to expose to the browser. Never returns
 * the DSN, password, or any secret material.
 */
export function summarizeConfig(cfg: DataSourceConfig | null): {
  configured: boolean;
  dialect?: Dialect;
  label?: string;
  host?: string;
  database?: string;
  updatedAt?: string;
  mappedResources?: ResourceKey[];
} {
  if (!cfg) return { configured: false };
  let host: string | undefined;
  let database: string | undefined;
  try {
    const url = new URL(decryptSecret(cfg.encryptedDsn));
    host = url.hostname || undefined;
    database = url.pathname.replace(/^\//, '') || undefined;
  } catch {
    /* leave undefined — opaque DSN */
  }
  return {
    configured: true,
    dialect: cfg.dialect,
    label: cfg.label,
    host,
    database,
    updatedAt: cfg.updatedAt,
    mappedResources: Object.keys(cfg.mappings) as ResourceKey[],
  };
}

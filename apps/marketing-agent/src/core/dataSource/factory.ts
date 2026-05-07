/**
 * Adapter factory — picks a `DataSource` implementation at runtime based on
 * the agent config (env-driven by default).
 *
 * Critical rule: **never statically import a DB driver here**. Each branch
 * must use `await import()` inside a try/catch so the bundler doesn't
 * resolve packages that aren't installed (this is what caused the recurring
 * `Module not found: 'pg'` errors). Adapter packages are listed as
 * optional peer-dependencies — install them only when you select that
 * adapter.
 */

import type { DataSource } from './types';
import { DataSourceNotConfiguredError } from './types';
import { MemoryDataSource, type MemoryDataSourceOptions } from './memoryDataSource';

export type DataSourceKind =
  | 'memory'
  | 'mock' // alias for "memory"
  | 'prisma'
  | 'mongo'
  | 'rest'
  | 'supabase'
  | 'firestore';

export interface DataSourceConfig {
  kind: DataSourceKind;
  /** Free-form per-adapter options (URL, db name, schema, …). */
  options?: Record<string, unknown>;
  /** Used only by the memory adapter. */
  memory?: MemoryDataSourceOptions;
}

let cached: { key: string; ds: DataSource } | null = null;

export async function createDataSource(config: DataSourceConfig): Promise<DataSource> {
  const cacheKey = JSON.stringify({ k: config.kind, o: config.options ?? {} });
  if (cached && cached.key === cacheKey) return cached.ds;

  let ds: DataSource;
  switch (config.kind) {
    case 'memory':
    case 'mock':
      ds = new MemoryDataSource(config.memory);
      break;

    case 'prisma':
      ds = await loadOptional(
        () => import('./prismaDataSource'),
        'prisma',
        'Install `@prisma/client` and run `pnpm --filter @curex24/database db:generate`, then set DATA_SOURCE=prisma + DATABASE_URL.',
      ).then((mod) => new mod.PrismaDataSource(config.options ?? {}));
      break;

    case 'rest':
      ds = await loadOptional(
        () => import('./restDataSource'),
        'rest',
        'Set DATA_SOURCE=rest and provide { baseUrl, token? } in datasource options.',
      ).then((mod) => new mod.RestDataSource(config.options ?? {}));
      break;

    case 'mongo':
    case 'supabase':
    case 'firestore':
      throw new DataSourceNotConfiguredError(
        config.kind,
        `Adapter "${config.kind}" is not bundled with marketing-agent. Implement it as an optional package and add a case here.`,
      );

    default: {
      const exhaustive: never = config.kind;
      throw new Error(`Unknown DataSource kind: ${String(exhaustive)}`);
    }
  }

  if (ds.connect) await ds.connect();
  cached = { key: cacheKey, ds };
  return ds;
}

export function resetDataSourceCache(): void {
  cached = null;
}

/**
 * Helper: dynamic-import an adapter module. If the underlying native driver
 * isn't installed we throw a clear, actionable error instead of the cryptic
 * `Module not found: 'pg'` style failure that blew up the build before.
 */
async function loadOptional<T>(
  loader: () => Promise<T>,
  kind: string,
  hint: string,
): Promise<T> {
  try {
    return await loader();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new DataSourceNotConfiguredError(kind, `${hint} (underlying error: ${msg})`);
  }
}

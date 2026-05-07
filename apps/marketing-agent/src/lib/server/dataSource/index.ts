/**
 * `getActiveDataSource()` is the single entry point used by the route layer.
 *
 * Selects a data source based on env:
 *   - When `DATABASE_URL` is set, returns a `PrismaDataSource` that reads &
 *     writes against the shared Postgres database via `@curex24/database`.
 *   - Otherwise (or if the Prisma client fails to load — e.g. the generated
 *     client is missing), falls back to the in-memory `MockDataSource` so
 *     local dev with no DB still works.
 *
 * Set `MARKETING_DATA_SOURCE=mock` to force the mock backend even when a
 * `DATABASE_URL` is present (useful for tests / demos).
 */

import { MockDataSource } from './mockDataSource';
import type { DataSource } from './types';

let cached: DataSource | null = null;

export function getActiveDataSource(): DataSource {
  if (cached) return cached;

  const forceMock = process.env.MARKETING_DATA_SOURCE === 'mock';
  const hasDatabaseUrl = !!process.env.DATABASE_URL && process.env.DATABASE_URL.length > 0;

  if (!forceMock && hasDatabaseUrl) {
    try {
      // Lazy require so missing Prisma client / @curex24/database doesn't crash
      // the mock-only path during local dev or unit tests.
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
      const { PrismaDataSource } = require('./prismaDataSource') as typeof import('./prismaDataSource');
      cached = new PrismaDataSource();
      return cached;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        '[marketing-agent] Failed to initialize PrismaDataSource — falling back to MockDataSource.',
        err,
      );
    }
  }

  cached = new MockDataSource();
  return cached;
}

/** Force the cached data source to be rebuilt. */
export function resetActiveDataSource(): void {
  cached = null;
}

export type { DataSource } from './types';

/**
 * `getActiveDataSource()` is the single entry point used by the legacy
 * `/api/backend/*` route layer.
 *
 * Selection rules:
 *
 *   - When `MARKETING_DATA_SOURCE=mock` (or its alias `=memory`) the
 *     in-memory `MockDataSource` is used. This is the only way to get
 *     mock data into the dashboard now.
 *
 *   - Otherwise, when `DATABASE_URL` is set (or `MARKETING_DATA_SOURCE`
 *     / `DATA_SOURCE` is `prisma`), reads & writes go through
 *     `PrismaDataSource`, hitting the `Marketing*` tables in the fcube
 *     Postgres database. If the Prisma client can't be loaded (e.g. the
 *     migrations haven't been run yet) we keep returning a Prisma
 *     instance with `status.degraded = true` so the dashboard banner
 *     surfaces the failure instead of silently serving stale seed data.
 *
 *   - With neither configured we fall back to the mock store as a
 *     developer convenience so the dashboard still renders.
 */

import { MockDataSource } from './mockDataSource';
import { dataSourcePreferenceFromEnv } from './preference';
import { PrismaDataSource } from './prismaDataSource';
import type { DataSource } from './types';

let cached: DataSource | null = null;

export function getActiveDataSource(): DataSource {
  if (cached) return cached;

  const preference = dataSourcePreferenceFromEnv();
  const hasDatabaseUrl = !!process.env.DATABASE_URL && process.env.DATABASE_URL.length > 0;

  if (preference === 'mock') {
    cached = new MockDataSource();
    return cached;
  }

  if (preference === 'prisma' || hasDatabaseUrl) {
    const ds = new PrismaDataSource();
    // Probe the connection lazily; if it fails the next read will throw.
    // `ds.connect()` already mutates `ds.status.degraded`; we swallow the
    // rejection here so the unhandled rejection doesn't crash the dev
    // server. The error message is preserved on `ds.status.error` and
    // surfaced in the dashboard banner — we never silently fall back to
    // mock data.
    void ds.connect().catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.warn(
        '[marketing-agent] PrismaDataSource probe failed; the dashboard ' +
          'will surface a degraded status banner. Underlying error:',
        err instanceof Error ? err.message : err,
      );
    });
    cached = ds;
    return cached;
  }

  cached = new MockDataSource();
  return cached;
}

/** Force the cached data source to be rebuilt (used by tests). */
export function resetActiveDataSource(): void {
  cached = null;
}

export type { DataSource } from './types';

/**
 * `getActiveDataSource()` is the single entry point used by the route layer.
 *
 * Selection:
 * - `MARKETING_DATA_SOURCE=mock`  -> force in-memory mock
 * - `MARKETING_DATA_SOURCE=prisma` -> force Prisma
 * - otherwise, use Prisma when `DATABASE_URL` is set; mock when unset
 */

import { MockDataSource } from './mockDataSource';
import { PrismaDataSource } from './prismaDataSource';
import type { DataSource } from './types';

let cached: DataSource | null = null;
let cachedKey = '';

export function getActiveDataSource(): DataSource {
  const key = resolveDataSourceKey();
  if (!cached || cachedKey !== key) {
    cached = key === 'prisma' ? new PrismaDataSource() : new MockDataSource();
    cachedKey = key;
  }
  return cached;
}

/** Force the cached data source to be rebuilt. */
export function resetActiveDataSource(): void {
  cached = null;
  cachedKey = '';
}

export type { DataSource } from './types';

function resolveDataSourceKey(): 'mock' | 'prisma' {
  const explicitDataSource = (process.env.MARKETING_DATA_SOURCE || '').trim().toLowerCase();
  if (explicitDataSource === 'mock') return 'mock';
  if (explicitDataSource === 'prisma') return 'prisma';
  return process.env.DATABASE_URL ? 'prisma' : 'mock';
}

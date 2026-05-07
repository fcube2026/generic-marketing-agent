/**
 * `getActiveDataSource()` is the single entry point used by the route layer.
 *
 * The marketing-agent ships with a self-contained in-memory mock backend, so
 * this always returns a `MockDataSource` instance.
 */

import { MockDataSource } from './mockDataSource';
import type { DataSource } from './types';

let cached: DataSource | null = null;

export function getActiveDataSource(): DataSource {
  if (!cached) cached = new MockDataSource();
  return cached;
}

/** Force the cached data source to be rebuilt. */
export function resetActiveDataSource(): void {
  cached = null;
}

export type { DataSource } from './types';

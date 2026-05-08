/**
 * Single source of truth for marketing-agent data-source selection.
 *
 * Used by both `mockStore.ts` (to decide whether to seed placeholder
 * content) and `dataSource/index.ts` (to pick `PrismaDataSource` vs
 * `MockDataSource`). Keep these consumers in lockstep — the dashboard
 * banner, the seed switch, and the active adapter must all agree.
 */

export type DataSourcePreference = 'mock' | 'prisma' | 'auto';

export function dataSourcePreferenceFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): DataSourcePreference {
  const raw = (env.MARKETING_DATA_SOURCE ?? env.DATA_SOURCE ?? '').trim().toLowerCase();
  if (raw === 'mock' || raw === 'memory') return 'mock';
  if (raw === 'prisma' || raw === 'fcube') return 'prisma';
  return 'auto';
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * `getActiveDataSource()` is the single entry point used by the route layer.
 *
 * Selection logic (highest priority first):
 *
 *   1. Persisted config exists at `MARKETING_AGENT_CONFIG_DIR/datasource.json`
 *      → instantiate `SqlDataSource`, wrap it with `ReadFallbackDataSource`
 *        so writes (which the SQL source rejects) silently delegate to the
 *        in-memory mock — keeping the UI's create/update flows working.
 *   2. Otherwise → return a plain `MockDataSource`.
 *
 * The instance is cached and re-built whenever the on-disk config changes.
 */

import { MockDataSource } from './mockDataSource';
import { SqlDataSource } from './sqlDataSource';
import { loadConfig, type DataSourceConfig } from './config';
import { ReadOnlyDataSourceError, type DataSource, type DataSourceStatus } from './types';

class ReadFallbackDataSource implements DataSource {
  readonly status: DataSourceStatus;
  constructor(private primary: DataSource, private fallback: DataSource) {
    this.status = primary.status;
  }

  // Reads ---------------------------------------------------------------
  getProfile() { return this.primary.getProfile(); }
  listCampaigns() { return this.primary.listCampaigns(); }
  listExperiments() { return this.primary.listExperiments(); }
  listContentItems() { return this.primary.listContentItems(); }
  listSeoPages() { return this.primary.listSeoPages(); }
  listKeywordClusters() { return this.primary.listKeywordClusters(); }
  listLifecycleFlows() { return this.primary.listLifecycleFlows(); }
  listPlanItems() { return this.primary.listPlanItems(); }
  async listKpis(category: Parameters<DataSource['listKpis']>[0]) {
    const v = await this.primary.listKpis(category);
    return v ?? this.fallback.listKpis(category);
  }
  getIntakeResponses() { return this.fallback.getIntakeResponses(); }

  // Writes — fall back to the mock for read-only primaries -------------
  private async writeOrFallback<T>(
    op: () => Promise<T>,
    fb: () => Promise<T>,
  ): Promise<T> {
    try {
      return await op();
    } catch (e) {
      if (e instanceof ReadOnlyDataSourceError) return fb();
      throw e;
    }
  }

  updateProfile(p: any) { return this.writeOrFallback(() => this.primary.updateProfile(p), () => this.fallback.updateProfile(p)); }
  putIntakeResponses(p: any) { return this.writeOrFallback(() => this.primary.putIntakeResponses(p), () => this.fallback.putIntakeResponses(p)); }

  createCampaign(i: any) { return this.writeOrFallback(() => this.primary.createCampaign(i), () => this.fallback.createCampaign(i)); }
  updateCampaign(id: string, p: any) { return this.writeOrFallback(() => this.primary.updateCampaign(id, p), () => this.fallback.updateCampaign(id, p)); }
  deleteCampaign(id: string) { return this.writeOrFallback(() => this.primary.deleteCampaign(id), () => this.fallback.deleteCampaign(id)); }

  createExperiment(i: any) { return this.writeOrFallback(() => this.primary.createExperiment(i), () => this.fallback.createExperiment(i)); }
  updateExperiment(id: string, p: any) { return this.writeOrFallback(() => this.primary.updateExperiment(id, p), () => this.fallback.updateExperiment(id, p)); }
  deleteExperiment(id: string) { return this.writeOrFallback(() => this.primary.deleteExperiment(id), () => this.fallback.deleteExperiment(id)); }

  createContentItem(i: any) { return this.writeOrFallback(() => this.primary.createContentItem(i), () => this.fallback.createContentItem(i)); }
  updateContentItem(id: string, p: any) { return this.writeOrFallback(() => this.primary.updateContentItem(id, p), () => this.fallback.updateContentItem(id, p)); }
  deleteContentItem(id: string) { return this.writeOrFallback(() => this.primary.deleteContentItem(id), () => this.fallback.deleteContentItem(id)); }

  createLifecycleFlow(i: any) { return this.writeOrFallback(() => this.primary.createLifecycleFlow(i), () => this.fallback.createLifecycleFlow(i)); }
  updateLifecycleFlow(id: string, p: any) { return this.writeOrFallback(() => this.primary.updateLifecycleFlow(id, p), () => this.fallback.updateLifecycleFlow(id, p)); }
  deleteLifecycleFlow(id: string) { return this.writeOrFallback(() => this.primary.deleteLifecycleFlow(id), () => this.fallback.deleteLifecycleFlow(id)); }

  createPlanItem(i: any) { return this.writeOrFallback(() => this.primary.createPlanItem(i), () => this.fallback.createPlanItem(i)); }
  updatePlanItem(id: string, p: any) { return this.writeOrFallback(() => this.primary.updatePlanItem(id, p), () => this.fallback.updatePlanItem(id, p)); }
  deletePlanItem(id: string) { return this.writeOrFallback(() => this.primary.deletePlanItem(id), () => this.fallback.deletePlanItem(id)); }

  createSeoPage(i: any) { return this.writeOrFallback(() => this.primary.createSeoPage(i), () => this.fallback.createSeoPage(i)); }
  updateSeoPage(id: string, p: any) { return this.writeOrFallback(() => this.primary.updateSeoPage(id, p), () => this.fallback.updateSeoPage(id, p)); }
  deleteSeoPage(id: string) { return this.writeOrFallback(() => this.primary.deleteSeoPage(id), () => this.fallback.deleteSeoPage(id)); }

  createKeywordCluster(i: any) { return this.writeOrFallback(() => this.primary.createKeywordCluster(i), () => this.fallback.createKeywordCluster(i)); }
  updateKeywordCluster(id: string, p: any) { return this.writeOrFallback(() => this.primary.updateKeywordCluster(id, p), () => this.fallback.updateKeywordCluster(id, p)); }
  deleteKeywordCluster(id: string) { return this.writeOrFallback(() => this.primary.deleteKeywordCluster(id), () => this.fallback.deleteKeywordCluster(id)); }
}

interface CachedDataSource {
  source: DataSource;
  configKey: string;
}

let cached: CachedDataSource | null = null;

function configKey(cfg: DataSourceConfig | null): string {
  if (!cfg) return 'mock';
  return `${cfg.dialect}::${cfg.encryptedDsn}::${cfg.updatedAt}`;
}

export function getActiveDataSource(): DataSource {
  const cfg = loadConfig();
  const key = configKey(cfg);
  if (cached && cached.configKey === key) return cached.source;

  let source: DataSource;
  if (cfg && cfg.encryptedDsn) {
    const sql = new SqlDataSource(cfg);
    source = new ReadFallbackDataSource(sql, new MockDataSource());
  } else {
    source = new MockDataSource();
  }
  cached = { source, configKey: key };
  return source;
}

/** Force the cached data source to be rebuilt (used after config changes). */
export function resetActiveDataSource(): void {
  cached = null;
}

export type { DataSource } from './types';

/**
 * Data source abstraction for the marketing-agent self-contained backend.
 *
 * The route handler under `src/app/api/backend/[...path]/route.ts` calls the
 * active `DataSource` for every read; writes also go through the source so
 * the implementation can decide whether to persist to the in-memory mock or
 * fall back gracefully (the SQL data source is read-only by default).
 *
 * One method exists per UI resource — the surface intentionally mirrors the
 * shape of the in-memory `mockStore` so swapping implementations is a no-op
 * for the route handler.
 */

import type {
  BusinessProfile,
  Campaign,
  ContentItem,
  Experiment,
  KeywordCluster,
  KpiMetric,
  LifecycleFlow,
  PlanItem,
  SeoPage,
} from '../../types';

export type IntakeResponses = Record<string, string | string[] | boolean | number>;

export type KpiCategory = 'north-star' | 'acquisition' | 'activation' | 'retention';

export type ResourceKey =
  | 'campaigns'
  | 'experiments'
  | 'contentItems'
  | 'seoPages'
  | 'keywordClusters'
  | 'lifecycleFlows'
  | 'planItems'
  | 'profile';

/**
 * High-level description of where the active data is coming from. Surfaced
 * to the UI banner so users always know which backend is in play.
 */
export interface DataSourceStatus {
  kind: 'mock' | 'sql' | 'rest' | 'prisma';
  label: string;
  /** Human-readable detail (host/db for SQL, base URL for REST, etc.). */
  detail?: string;
  /** True when the data source is configured but failed to connect. */
  degraded?: boolean;
  /** Last error message if degraded. */
  error?: string;
}

export interface DataSource {
  readonly status: DataSourceStatus;

  // Reads ---------------------------------------------------------------
  getProfile(): Promise<BusinessProfile>;
  listCampaigns(): Promise<Campaign[]>;
  listExperiments(): Promise<Experiment[]>;
  listContentItems(): Promise<ContentItem[]>;
  listSeoPages(): Promise<SeoPage[]>;
  listKeywordClusters(): Promise<KeywordCluster[]>;
  listLifecycleFlows(): Promise<LifecycleFlow[]>;
  listPlanItems(): Promise<PlanItem[]>;
  listKpis(category: KpiCategory): Promise<KpiMetric[] | null>;
  getIntakeResponses(): Promise<IntakeResponses>;

  // Writes --------------------------------------------------------------
  // Implementations that don't support writes (e.g. read-only SQL) should
  // throw `ReadOnlyDataSourceError` so the route layer can return 405.
  updateProfile(patch: Partial<BusinessProfile>): Promise<BusinessProfile>;
  putIntakeResponses(patch: IntakeResponses): Promise<IntakeResponses>;

  createCampaign(input: Omit<Campaign, 'id'>): Promise<Campaign>;
  updateCampaign(id: string, patch: Partial<Campaign>): Promise<Campaign | null>;
  deleteCampaign(id: string): Promise<boolean>;

  createExperiment(input: Omit<Experiment, 'id'>): Promise<Experiment>;
  updateExperiment(id: string, patch: Partial<Experiment>): Promise<Experiment | null>;
  deleteExperiment(id: string): Promise<boolean>;

  createContentItem(input: Omit<ContentItem, 'id'>): Promise<ContentItem>;
  updateContentItem(id: string, patch: Partial<ContentItem>): Promise<ContentItem | null>;
  deleteContentItem(id: string): Promise<boolean>;

  createLifecycleFlow(input: Omit<LifecycleFlow, 'id'>): Promise<LifecycleFlow>;
  updateLifecycleFlow(id: string, patch: Partial<LifecycleFlow>): Promise<LifecycleFlow | null>;
  deleteLifecycleFlow(id: string): Promise<boolean>;

  createPlanItem(input: Omit<PlanItem, 'id'>): Promise<PlanItem>;
  updatePlanItem(id: string, patch: Partial<PlanItem>): Promise<PlanItem | null>;
  deletePlanItem(id: string): Promise<boolean>;

  createSeoPage(input: Omit<SeoPage, 'id'>): Promise<SeoPage>;
  updateSeoPage(id: string, patch: Partial<SeoPage>): Promise<SeoPage | null>;
  deleteSeoPage(id: string): Promise<boolean>;

  createKeywordCluster(input: Omit<KeywordCluster, 'id'>): Promise<KeywordCluster>;
  updateKeywordCluster(id: string, patch: Partial<KeywordCluster>): Promise<KeywordCluster | null>;
  deleteKeywordCluster(id: string): Promise<boolean>;
}

export class ReadOnlyDataSourceError extends Error {
  constructor(resource: string) {
    super(`Data source is read-only for resource: ${resource}`);
    this.name = 'ReadOnlyDataSourceError';
  }
}

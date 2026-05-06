/**
 * Postgres-backed `DataSource`.
 *
 * Read-only: every query is a parameterised `SELECT` with a per-statement
 * timeout and a hard row cap. Identifier interpolation is gated by
 * `validateMapping` + `safeIdentifier` (introspect.ts) so a user-supplied
 * mapping cannot smuggle SQL into a query.
 *
 * Writes intentionally throw `ReadOnlyDataSourceError` — the route layer
 * delegates writes to the mock data source so the UI's "Create Campaign"
 * etc. still work without us mutating an unknown user schema.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

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
import {
  type DataSource,
  type DataSourceStatus,
  type IntakeResponses,
  type KpiCategory,
  ReadOnlyDataSourceError,
  type ResourceKey,
} from './types';
import { type DataSourceConfig, type ResourceMapping, getDsn } from './config';
import {
  type IntrospectedSchema,
  type IntrospectedTable,
  safeIdentifier,
  suggestMappings,
  validateMapping,
} from './introspect';

const STATEMENT_TIMEOUT_MS = 5000;
const ROW_CAP = 1000;

// Lazily import pg so we don't pay the cost when SQL mode is unused.
// The `webpackIgnore` magic comment prevents webpack from trying to resolve
// `pg` at build time — it is an optional dependency that may not be
// installed (e.g. when no SQL data source is configured), and bundling it
// would otherwise fail the Next.js build with `Module not found`.
async function getPgPool(dsn: string): Promise<any> {
  const pg = await import(/* webpackIgnore: true */ 'pg').catch(() => {
    throw new Error('The "pg" package is required for SQL data sources but failed to load.');
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Pool = (pg as any).Pool ?? (pg as any).default?.Pool;
  return new Pool({
    connectionString: dsn,
    max: 5,
    statement_timeout: STATEMENT_TIMEOUT_MS,
    idle_in_transaction_session_timeout: STATEMENT_TIMEOUT_MS,
  });
}

export async function introspectSchema(dsn: string): Promise<IntrospectedSchema> {
  const pool = await getPgPool(dsn);
  try {
    const tablesRes = await pool.query(
      `SELECT table_schema, table_name
         FROM information_schema.tables
        WHERE table_schema NOT IN ('pg_catalog','information_schema')
          AND table_type = 'BASE TABLE'
        ORDER BY table_schema, table_name`,
    );
    if (tablesRes.rows.length === 0) return { tables: [] };
    const colRes = await pool.query(
      `SELECT table_schema, table_name, column_name, data_type, is_nullable
         FROM information_schema.columns
        WHERE table_schema NOT IN ('pg_catalog','information_schema')
        ORDER BY table_schema, table_name, ordinal_position`,
    );
    const byTable = new Map<string, IntrospectedTable>();
    for (const r of tablesRes.rows) {
      const key = `${r.table_schema}.${r.table_name}`;
      byTable.set(key, { schema: r.table_schema, name: r.table_name, columns: [] });
    }
    for (const c of colRes.rows) {
      const key = `${c.table_schema}.${c.table_name}`;
      const t = byTable.get(key);
      if (t) {
        t.columns.push({
          name: c.column_name,
          dataType: c.data_type,
          nullable: c.is_nullable === 'YES',
        });
      }
    }
    return { tables: Array.from(byTable.values()) };
  } finally {
    await pool.end().catch(() => undefined);
  }
}

export async function testConnection(dsn: string): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const t0 = Date.now();
  try {
    const pool = await getPgPool(dsn);
    try {
      await pool.query('SELECT 1');
      return { ok: true, latencyMs: Date.now() - t0 };
    } finally {
      await pool.end().catch(() => undefined);
    }
  } catch (e: any) {
    return { ok: false, latencyMs: Date.now() - t0, error: e?.message || String(e) };
  }
}

export class SqlDataSource implements DataSource {
  readonly status: DataSourceStatus;

  private pool: any | null = null;
  private schemaCache: IntrospectedSchema | null = null;
  private resolvedMappings: Partial<Record<ResourceKey, ResourceMapping>> = {};
  private initPromise: Promise<void> | null = null;

  constructor(private cfg: DataSourceConfig) {
    let host: string | undefined;
    let database: string | undefined;
    try {
      const url = new URL(getDsn(cfg));
      host = url.hostname;
      database = url.pathname.replace(/^\//, '');
    } catch { /* ignore */ }
    this.status = {
      kind: 'sql',
      label: cfg.label || `Postgres: ${host || 'unknown'}/${database || 'unknown'}`,
      detail: host && database ? `${host}/${database}` : undefined,
    };
  }

  private async ensureReady(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      const dsn = getDsn(this.cfg);
      try {
        this.pool = await getPgPool(dsn);
        this.schemaCache = await introspectSchema(dsn);
        const auto = suggestMappings(this.schemaCache);
        this.resolvedMappings = { ...auto, ...(this.cfg.mappings || {}) };
        // Validate user overrides — drop invalid ones rather than crashing.
        for (const key of Object.keys(this.cfg.mappings || {}) as ResourceKey[]) {
          const m = this.cfg.mappings?.[key];
          if (!m) continue;
          const v = validateMapping(key, m, this.schemaCache);
          if (!v.ok) {
            // eslint-disable-next-line no-console
            console.warn(`[marketing-agent] Dropping invalid mapping for ${key}: ${v.error}`);
            delete this.resolvedMappings[key];
          }
        }
      } catch (e: any) {
        this.status.degraded = true;
        this.status.error = e?.message || String(e);
      }
    })();
    return this.initPromise;
  }

  private async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    await this.ensureReady();
    if (!this.pool) return [];
    const res = await this.pool.query({ text: sql, values: params, rowMode: undefined });
    return res.rows as T[];
  }

  private mappingFor(resource: ResourceKey): ResourceMapping | null {
    return this.resolvedMappings[resource] ?? null;
  }

  /**
   * Build a `SELECT col AS field, ... FROM table LIMIT N` for the given
   * resource's mapping. All identifiers are validated *and* quoted so
   * malicious mapping values cannot inject SQL.
   */
  private buildSelect(resource: ResourceKey, mapping: ResourceMapping): string {
    const table = safeIdentifier(mapping.table);
    const fields = Object.entries(mapping.columns).map(([field, col]) => {
      // The destination alias is hard-coded by the resource type, never
      // user-supplied — but quote it anyway for symmetry.
      return `${safeIdentifier(col)} AS ${safeIdentifier(field)}`;
    });
    if (fields.length === 0) {
      throw new Error(`No mapped columns for resource ${resource}`);
    }
    return `SELECT ${fields.join(', ')} FROM ${table} LIMIT ${ROW_CAP}`;
  }

  private async readResource<T>(resource: ResourceKey): Promise<T[]> {
    const m = this.mappingFor(resource);
    if (!m) return [];
    try {
      const sql = this.buildSelect(resource, m);
      return await this.query<T>(sql);
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.warn(`[marketing-agent] SQL read for ${resource} failed: ${e?.message || e}`);
      return [];
    }
  }

  // Reads ---------------------------------------------------------------

  async getProfile(): Promise<BusinessProfile> {
    const m = this.mappingFor('profile');
    const empty: BusinessProfile = {
      primaryGrowthFocus: 'both',
      biggestBottleneck: 'demand',
      monthlyBudget: 0,
      allocatedBudget: 0,
      targetCities: [],
      bestPerforming: '',
      topPatientPersona: '',
      topReasonPatientChooses: '',
      topReasonProviderJoins: '',
      competitors: [],
      founderLedBrand: false,
    };
    if (!m) return empty;
    try {
      const sql = `${this.buildSelect('profile', m)}`;
      const rows = await this.query<Partial<BusinessProfile>>(sql);
      const row = rows[0];
      if (!row) return empty;
      return { ...empty, ...row } as BusinessProfile;
    } catch {
      return empty;
    }
  }

  listCampaigns()        { return this.readResource<Campaign>('campaigns'); }
  listExperiments()      { return this.readResource<Experiment>('experiments'); }
  listContentItems()     { return this.readResource<ContentItem>('contentItems'); }
  listSeoPages()         { return this.readResource<SeoPage>('seoPages'); }
  listKeywordClusters()  { return this.readResource<KeywordCluster>('keywordClusters'); }
  listLifecycleFlows()   { return this.readResource<LifecycleFlow>('lifecycleFlows'); }
  listPlanItems()        { return this.readResource<PlanItem>('planItems'); }

  async listKpis(_category: KpiCategory): Promise<KpiMetric[] | null> {
    // KPIs are heavily structured (label/value/target/trend/status). We
    // intentionally do not auto-map them from arbitrary schemas; the UI
    // falls back to the mock KPIs when the SQL source returns null.
    void _category;
    return null;
  }

  async getIntakeResponses(): Promise<IntakeResponses> {
    return {};
  }

  // Writes (read-only — delegated to mock at the route level) ----------
  updateProfile(): never { throw new ReadOnlyDataSourceError('profile'); }
  putIntakeResponses(): never { throw new ReadOnlyDataSourceError('intake-responses'); }
  createCampaign(): never { throw new ReadOnlyDataSourceError('campaigns'); }
  updateCampaign(): never { throw new ReadOnlyDataSourceError('campaigns'); }
  deleteCampaign(): never { throw new ReadOnlyDataSourceError('campaigns'); }
  createExperiment(): never { throw new ReadOnlyDataSourceError('experiments'); }
  updateExperiment(): never { throw new ReadOnlyDataSourceError('experiments'); }
  deleteExperiment(): never { throw new ReadOnlyDataSourceError('experiments'); }
  createContentItem(): never { throw new ReadOnlyDataSourceError('content-calendar'); }
  updateContentItem(): never { throw new ReadOnlyDataSourceError('content-calendar'); }
  deleteContentItem(): never { throw new ReadOnlyDataSourceError('content-calendar'); }
  createLifecycleFlow(): never { throw new ReadOnlyDataSourceError('lifecycle-flows'); }
  updateLifecycleFlow(): never { throw new ReadOnlyDataSourceError('lifecycle-flows'); }
  deleteLifecycleFlow(): never { throw new ReadOnlyDataSourceError('lifecycle-flows'); }
  createPlanItem(): never { throw new ReadOnlyDataSourceError('plan-items'); }
  updatePlanItem(): never { throw new ReadOnlyDataSourceError('plan-items'); }
  deletePlanItem(): never { throw new ReadOnlyDataSourceError('plan-items'); }
  createSeoPage(): never { throw new ReadOnlyDataSourceError('seo/pages'); }
  updateSeoPage(): never { throw new ReadOnlyDataSourceError('seo/pages'); }
  deleteSeoPage(): never { throw new ReadOnlyDataSourceError('seo/pages'); }
  createKeywordCluster(): never { throw new ReadOnlyDataSourceError('seo/keyword-clusters'); }
  updateKeywordCluster(): never { throw new ReadOnlyDataSourceError('seo/keyword-clusters'); }
  deleteKeywordCluster(): never { throw new ReadOnlyDataSourceError('seo/keyword-clusters'); }

  /** Expose the introspected schema (for the Settings UI). */
  async getSchema(): Promise<IntrospectedSchema> {
    await this.ensureReady();
    return this.schemaCache ?? { tables: [] };
  }

  /** Expose the resolved (auto + user-override) mappings. */
  async getResolvedMappings(): Promise<Partial<Record<ResourceKey, ResourceMapping>>> {
    await this.ensureReady();
    return { ...this.resolvedMappings };
  }

  /** Cleanly tear down the pool — used when the config changes. */
  async dispose(): Promise<void> {
    try {
      if (this.pool) await this.pool.end();
    } catch { /* ignore */ }
    this.pool = null;
  }
}

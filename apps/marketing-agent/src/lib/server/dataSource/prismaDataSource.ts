/**
 * Prisma-backed `DataSource` for the legacy `/api/backend/*` route layer.
 *
 * Maps each `DataSource` method onto the `Marketing*` models declared in
 * `packages/database/prisma/schema.prisma`. Reads return data shaped to
 * the TypeScript types in `lib/types.ts` (member/subscriber terminology),
 * translating the Prisma schema's healthcare-flavoured field names where
 * they differ.
 *
 * The Prisma client is loaded via dynamic `import()` inside try/catch so
 * the bundler never resolves `@prisma/client` when the adapter isn't
 * selected. If `@prisma/client` is missing or hasn't been generated yet
 * the adapter surfaces a clear error and `getActiveDataSource()` flips
 * its banner to `degraded` instead of crashing the route handler.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  BusinessProfile,
  Campaign,
  ContentItem,
  ContentPillar,
  Experiment,
  ExperimentStatus,
  KeywordCluster,
  KpiMetric,
  LifecycleFlow,
  LifecycleFlowStep,
  PlanItem,
  SeoPage,
} from '../../types';
import type {
  DataSource,
  DataSourceStatus,
  IntakeResponses,
  KpiCategory,
} from './types';

const PROFILE_SINGLETON_ID = 'default';

/** Default profile returned when no row exists yet — matches `BusinessProfile`. */
const EMPTY_PROFILE: BusinessProfile = {
  primaryGrowthFocus: 'both',
  biggestBottleneck: 'acquisition',
  monthlyBudget: 0,
  allocatedBudget: 0,
  targetCities: [],
  bestPerforming: '',
  topMemberPersona: '',
  topReasonMemberJoins: '',
  topReasonMemberSubscribes: '',
  competitors: [],
  founderLedBrand: false,
};

export interface PrismaDataSourceOptions {
  /** Override `DATABASE_URL` (mainly used by tests). */
  datasourceUrl?: string;
  /** Pre-built Prisma client, used by tests to inject a stub. */
  client?: unknown;
}

export class PrismaDataSource implements DataSource {
  status: DataSourceStatus;
  private clientPromise: Promise<any> | null = null;

  constructor(private readonly opts: PrismaDataSourceOptions = {}) {
    this.status = {
      kind: 'prisma',
      label: 'fcube database (Prisma)',
      detail: maskUrl(opts.datasourceUrl ?? process.env.DATABASE_URL),
    };
  }

  /** Eagerly resolve the client so connection errors surface at boot. */
  async connect(): Promise<void> {
    try {
      await this.client();
    } catch (err) {
      this.status = {
        ...this.status,
        degraded: true,
        error: err instanceof Error ? err.message : String(err),
      };
      throw err;
    }
  }

  // ─── Reads ──────────────────────────────────────────────────────────────

  async getProfile(): Promise<BusinessProfile> {
    const client = await this.client();
    const row = await client.marketingBusinessProfile.findUnique({
      where: { id: PROFILE_SINGLETON_ID },
    });
    if (!row) return { ...EMPTY_PROFILE };
    return profileFromPrisma(row);
  }

  async listCampaigns(): Promise<Campaign[]> {
    const client = await this.client();
    const rows = await client.marketingCampaign.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(campaignFromPrisma);
  }

  async listExperiments(): Promise<Experiment[]> {
    const client = await this.client();
    const rows = await client.marketingExperiment.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(experimentFromPrisma);
  }

  async listContentItems(): Promise<ContentItem[]> {
    const client = await this.client();
    const rows = await client.marketingContentItem.findMany({
      orderBy: [{ week: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(contentItemFromPrisma);
  }

  async listSeoPages(): Promise<SeoPage[]> {
    const client = await this.client();
    const rows = await client.marketingSeoPage.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(seoPageFromPrisma);
  }

  async listKeywordClusters(): Promise<KeywordCluster[]> {
    const client = await this.client();
    const rows = await client.marketingKeywordCluster.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(keywordClusterFromPrisma);
  }

  async listLifecycleFlows(): Promise<LifecycleFlow[]> {
    const client = await this.client();
    const rows = await client.marketingLifecycleFlow.findMany({
      include: { steps: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(lifecycleFlowFromPrisma);
  }

  async listPlanItems(): Promise<PlanItem[]> {
    const client = await this.client();
    const rows = await client.marketingPlanItem.findMany({
      orderBy: [{ phase: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(planItemFromPrisma);
  }

  /**
   * KPI metrics have no Prisma model yet (Phase 1 of the FCube finance
   * roadmap). Return an empty list so the dashboard renders an empty
   * state rather than the previous fabricated numbers — never invent
   * metric values that don't exist in the database.
   */
  async listKpis(_category: KpiCategory): Promise<KpiMetric[]> {
    void _category;
    return [];
  }

  async getIntakeResponses(): Promise<IntakeResponses> {
    const client = await this.client();
    const rows = await client.marketingIntakeResponse.findMany();
    const out: IntakeResponses = {};
    for (const row of rows) {
      out[row.questionId] = row.value as IntakeResponses[string];
    }
    return out;
  }

  // ─── Writes ─────────────────────────────────────────────────────────────

  async updateProfile(patch: Partial<BusinessProfile>): Promise<BusinessProfile> {
    const client = await this.client();
    const data = profileToPrisma(patch);
    const row = await client.marketingBusinessProfile.upsert({
      where: { id: PROFILE_SINGLETON_ID },
      create: { id: PROFILE_SINGLETON_ID, ...profileToPrisma({ ...EMPTY_PROFILE, ...patch }) },
      update: data,
    });
    return profileFromPrisma(row);
  }

  async putIntakeResponses(patch: IntakeResponses): Promise<IntakeResponses> {
    const client = await this.client();
    for (const [questionId, value] of Object.entries(patch)) {
      await client.marketingIntakeResponse.upsert({
        where: { questionId },
        create: { questionId, value: value as any },
        update: { value: value as any },
      });
    }
    return this.getIntakeResponses();
  }

  // Campaigns ----------------------------------------------------------
  async createCampaign(input: Omit<Campaign, 'id'>): Promise<Campaign> {
    const client = await this.client();
    const row = await client.marketingCampaign.create({ data: campaignToPrisma(input) });
    return campaignFromPrisma(row);
  }
  async updateCampaign(id: string, patch: Partial<Campaign>): Promise<Campaign | null> {
    const client = await this.client();
    try {
      const row = await client.marketingCampaign.update({
        where: { id },
        data: campaignToPrisma(patch),
      });
      return campaignFromPrisma(row);
    } catch {
      return null;
    }
  }
  async deleteCampaign(id: string): Promise<boolean> {
    return safeDelete(await this.client(), 'marketingCampaign', id);
  }

  // Experiments --------------------------------------------------------
  async createExperiment(input: Omit<Experiment, 'id'>): Promise<Experiment> {
    const client = await this.client();
    const row = await client.marketingExperiment.create({ data: experimentToPrisma(input) });
    return experimentFromPrisma(row);
  }
  async updateExperiment(id: string, patch: Partial<Experiment>): Promise<Experiment | null> {
    const client = await this.client();
    try {
      const row = await client.marketingExperiment.update({
        where: { id },
        data: experimentToPrisma(patch),
      });
      return experimentFromPrisma(row);
    } catch {
      return null;
    }
  }
  async deleteExperiment(id: string): Promise<boolean> {
    return safeDelete(await this.client(), 'marketingExperiment', id);
  }

  // Content items ------------------------------------------------------
  async createContentItem(input: Omit<ContentItem, 'id'>): Promise<ContentItem> {
    const client = await this.client();
    const row = await client.marketingContentItem.create({
      data: contentItemToPrisma(input),
    });
    return contentItemFromPrisma(row);
  }
  async updateContentItem(id: string, patch: Partial<ContentItem>): Promise<ContentItem | null> {
    const client = await this.client();
    try {
      const row = await client.marketingContentItem.update({
        where: { id },
        data: contentItemToPrisma(patch),
      });
      return contentItemFromPrisma(row);
    } catch {
      return null;
    }
  }
  async deleteContentItem(id: string): Promise<boolean> {
    return safeDelete(await this.client(), 'marketingContentItem', id);
  }

  // Lifecycle flows ----------------------------------------------------
  async createLifecycleFlow(input: Omit<LifecycleFlow, 'id'>): Promise<LifecycleFlow> {
    const client = await this.client();
    const { steps, ...rest } = input;
    const row = await client.marketingLifecycleFlow.create({
      data: {
        ...rest,
        steps: { create: stepsToPrisma(steps) },
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
    return lifecycleFlowFromPrisma(row);
  }
  async updateLifecycleFlow(
    id: string,
    patch: Partial<LifecycleFlow>,
  ): Promise<LifecycleFlow | null> {
    const client = await this.client();
    try {
      const { steps, ...rest } = patch;
      // Replace nested steps wholesale when provided to keep semantics
      // identical to the in-memory store.
      const row = await client.marketingLifecycleFlow.update({
        where: { id },
        data: {
          ...rest,
          ...(steps
            ? {
                steps: {
                  deleteMany: {},
                  create: stepsToPrisma(steps),
                },
              }
            : {}),
        },
        include: { steps: { orderBy: { order: 'asc' } } },
      });
      return lifecycleFlowFromPrisma(row);
    } catch {
      return null;
    }
  }
  async deleteLifecycleFlow(id: string): Promise<boolean> {
    return safeDelete(await this.client(), 'marketingLifecycleFlow', id);
  }

  // Plan items ---------------------------------------------------------
  async createPlanItem(input: Omit<PlanItem, 'id'>): Promise<PlanItem> {
    const client = await this.client();
    const row = await client.marketingPlanItem.create({ data: planItemToPrisma(input) });
    return planItemFromPrisma(row);
  }
  async updatePlanItem(id: string, patch: Partial<PlanItem>): Promise<PlanItem | null> {
    const client = await this.client();
    try {
      const row = await client.marketingPlanItem.update({
        where: { id },
        data: planItemToPrisma(patch),
      });
      return planItemFromPrisma(row);
    } catch {
      return null;
    }
  }
  async deletePlanItem(id: string): Promise<boolean> {
    return safeDelete(await this.client(), 'marketingPlanItem', id);
  }

  // SEO pages ----------------------------------------------------------
  async createSeoPage(input: Omit<SeoPage, 'id'>): Promise<SeoPage> {
    const client = await this.client();
    const row = await client.marketingSeoPage.create({ data: seoPageToPrisma(input) });
    return seoPageFromPrisma(row);
  }
  async updateSeoPage(id: string, patch: Partial<SeoPage>): Promise<SeoPage | null> {
    const client = await this.client();
    try {
      const row = await client.marketingSeoPage.update({
        where: { id },
        data: seoPageToPrisma(patch),
      });
      return seoPageFromPrisma(row);
    } catch {
      return null;
    }
  }
  async deleteSeoPage(id: string): Promise<boolean> {
    return safeDelete(await this.client(), 'marketingSeoPage', id);
  }

  // Keyword clusters ---------------------------------------------------
  async createKeywordCluster(input: Omit<KeywordCluster, 'id'>): Promise<KeywordCluster> {
    const client = await this.client();
    const row = await client.marketingKeywordCluster.create({
      data: keywordClusterToPrisma(input),
    });
    return keywordClusterFromPrisma(row);
  }
  async updateKeywordCluster(
    id: string,
    patch: Partial<KeywordCluster>,
  ): Promise<KeywordCluster | null> {
    const client = await this.client();
    try {
      const row = await client.marketingKeywordCluster.update({
        where: { id },
        data: keywordClusterToPrisma(patch),
      });
      return keywordClusterFromPrisma(row);
    } catch {
      return null;
    }
  }
  async deleteKeywordCluster(id: string): Promise<boolean> {
    return safeDelete(await this.client(), 'marketingKeywordCluster', id);
  }

  // ─── Internals ──────────────────────────────────────────────────────────

  private client(): Promise<any> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        if (this.opts.client) return this.opts.client;
        // Dynamic import keeps `@prisma/client` out of the bundle for
        // anyone using the in-memory adapter and isolates the failure
        // mode when the client hasn't been generated yet.
        let mod: { PrismaClient: new (cfg?: unknown) => any };
        try {
          mod = (await import(
            /* webpackIgnore: true */
            '@prisma/client'
          )) as { PrismaClient: new (cfg?: unknown) => any };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          throw new Error(
            'PrismaDataSource: could not load @prisma/client. Run ' +
              '`pnpm --filter @curex24/database db:generate` and ensure ' +
              'DATABASE_URL points at the fcube Postgres instance. ' +
              `(underlying error: ${msg})`,
          );
        }
        return new mod.PrismaClient(
          this.opts.datasourceUrl ? { datasourceUrl: this.opts.datasourceUrl } : undefined,
        );
      })();
    }
    return this.clientPromise;
  }
}

// ─── Mappers ──────────────────────────────────────────────────────────────

function profileFromPrisma(row: any): BusinessProfile {
  return {
    primaryGrowthFocus: (row.primaryGrowthFocus ?? 'both') as BusinessProfile['primaryGrowthFocus'],
    biggestBottleneck: (row.biggestBottleneck ?? 'acquisition') as BusinessProfile['biggestBottleneck'],
    monthlyBudget: row.monthlyBudget ?? 0,
    allocatedBudget: row.allocatedBudget ?? 0,
    targetCities: row.targetCities ?? [],
    bestPerforming: row.bestPerforming ?? '',
    // The Prisma schema still uses healthcare-flavoured field names; map
    // them onto the member/subscriber terminology used by the UI.
    topMemberPersona: row.topPatientPersona ?? '',
    topReasonMemberJoins: row.topReasonPatientChooses ?? '',
    topReasonMemberSubscribes: row.topReasonProviderJoins ?? '',
    competitors: row.competitors ?? [],
    founderLedBrand: row.founderLedBrand ?? false,
  };
}

function profileToPrisma(p: Partial<BusinessProfile>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.primaryGrowthFocus !== undefined) out.primaryGrowthFocus = p.primaryGrowthFocus;
  if (p.biggestBottleneck !== undefined) out.biggestBottleneck = p.biggestBottleneck;
  if (p.monthlyBudget !== undefined) out.monthlyBudget = p.monthlyBudget;
  if (p.allocatedBudget !== undefined) out.allocatedBudget = p.allocatedBudget;
  if (p.targetCities !== undefined) out.targetCities = p.targetCities;
  if (p.bestPerforming !== undefined) out.bestPerforming = p.bestPerforming;
  if (p.topMemberPersona !== undefined) out.topPatientPersona = p.topMemberPersona;
  if (p.topReasonMemberJoins !== undefined) out.topReasonPatientChooses = p.topReasonMemberJoins;
  if (p.topReasonMemberSubscribes !== undefined)
    out.topReasonProviderJoins = p.topReasonMemberSubscribes;
  if (p.competitors !== undefined) out.competitors = p.competitors;
  if (p.founderLedBrand !== undefined) out.founderLedBrand = p.founderLedBrand;
  return out;
}

function campaignFromPrisma(row: any): Campaign {
  return {
    id: row.id,
    name: row.name,
    objective: row.objective ?? '',
    channel: row.channel ?? '',
    audience: row.audience ?? '',
    budget: row.budget ?? '',
    duration: row.duration ?? '',
    kpi: row.kpi ?? '',
    status: (row.status ?? 'planned') as Campaign['status'],
    headline: row.headline ?? [],
    description: row.description ?? [],
  };
}

function campaignToPrisma(c: Partial<Campaign>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of [
    'name', 'objective', 'channel', 'audience', 'budget',
    'duration', 'kpi', 'status', 'headline', 'description',
  ] as const) {
    if (c[key] !== undefined) out[key] = c[key];
  }
  return out;
}

function experimentFromPrisma(row: any): Experiment {
  return {
    id: row.id,
    name: row.name,
    hypothesis: row.hypothesis ?? '',
    channel: row.channel ?? '',
    control: row.control ?? '',
    variant: row.variant ?? '',
    metric: row.metric ?? '',
    startDate: row.startDate ?? '',
    endDate: row.endDate ?? '',
    result: row.result ?? undefined,
    winner: (row.winner ?? undefined) as Experiment['winner'],
    status: (row.status ?? 'planned') as ExperimentStatus,
    lift: row.lift ?? undefined,
  };
}

function experimentToPrisma(e: Partial<Experiment>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of [
    'name', 'hypothesis', 'channel', 'control', 'variant',
    'metric', 'startDate', 'endDate', 'result', 'winner', 'status', 'lift',
  ] as const) {
    if (e[key] !== undefined) out[key] = e[key];
  }
  return out;
}

function contentItemFromPrisma(row: any): ContentItem {
  return {
    id: row.id,
    week: row.week,
    day: row.day,
    platform: row.platform,
    pillar: row.pillar as ContentPillar,
    title: row.title,
    format: row.format,
    status: (row.status ?? 'planned') as ContentItem['status'],
  };
}

function contentItemToPrisma(c: Partial<ContentItem>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of ['week', 'day', 'platform', 'pillar', 'title', 'format', 'status'] as const) {
    if (c[key] !== undefined) out[key] = c[key];
  }
  return out;
}

function seoPageFromPrisma(row: any): SeoPage {
  return {
    id: row.id,
    url: row.url,
    type: row.type as SeoPage['type'],
    title: row.title,
    status: (row.status ?? 'planned') as SeoPage['status'],
    targetKeyword: row.targetKeyword ?? '',
  };
}

function seoPageToPrisma(s: Partial<SeoPage>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of ['url', 'type', 'title', 'status', 'targetKeyword'] as const) {
    if (s[key] !== undefined) out[key] = s[key];
  }
  return out;
}

function keywordClusterFromPrisma(row: any): KeywordCluster {
  return {
    id: row.id,
    cluster: row.cluster,
    type: row.type as KeywordCluster['type'],
    priority: row.priority as KeywordCluster['priority'],
    keywords: Array.isArray(row.keywords) ? row.keywords : [],
  };
}

function keywordClusterToPrisma(k: Partial<KeywordCluster>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (k.cluster !== undefined) out.cluster = k.cluster;
  if (k.type !== undefined) out.type = k.type;
  if (k.priority !== undefined) out.priority = k.priority;
  if (k.keywords !== undefined) out.keywords = k.keywords as any;
  return out;
}

function lifecycleFlowFromPrisma(row: any): LifecycleFlow {
  const steps: LifecycleFlowStep[] = (row.steps ?? []).map((s: any) => ({
    day: s.day,
    channel: s.channel,
    message: s.message,
    goal: s.goal,
  }));
  return {
    id: row.id,
    name: row.name,
    segment: row.segment as LifecycleFlow['segment'],
    trigger: row.trigger ?? '',
    status: (row.status ?? 'draft') as LifecycleFlow['status'],
    steps,
  };
}

function stepsToPrisma(steps: LifecycleFlowStep[] | undefined): unknown[] {
  if (!steps) return [];
  return steps.map((s, idx) => ({
    day: s.day,
    channel: s.channel,
    message: s.message,
    goal: s.goal,
    order: idx,
  }));
}

function planItemFromPrisma(row: any): PlanItem {
  return {
    id: row.id,
    phase: row.phase as PlanItem['phase'],
    category: row.category ?? '',
    task: row.task,
    owner: row.owner ?? '',
    done: !!row.done,
  };
}

function planItemToPrisma(p: Partial<PlanItem>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of ['phase', 'category', 'task', 'owner', 'done'] as const) {
    if (p[key] !== undefined) out[key] = p[key];
  }
  return out;
}

async function safeDelete(client: any, model: string, id: string): Promise<boolean> {
  try {
    await client[model].delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

function maskUrl(url: string | undefined): string {
  if (!url) return '<unset DATABASE_URL>';
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return '<invalid DATABASE_URL>';
  }
}

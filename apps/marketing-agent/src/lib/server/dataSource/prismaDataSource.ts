/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@curex24/database';
import type {
  BusinessProfile,
  Campaign,
  ContentItem,
  Experiment,
  KeywordCluster,
  KpiMetric,
  LifecycleFlow,
  LifecycleFlowStep,
  PlanItem,
  SeoPage,
} from '../../types';
import type { DataSource, DataSourceStatus, IntakeResponses, KpiCategory } from './types';

const DEFAULT_PROFILE_ID = 'default';

export class PrismaDataSource implements DataSource {
  readonly status: DataSourceStatus = {
    kind: 'sql',
    label: 'Prisma (DATABASE_URL)',
    detail: maskDatabaseUrl(process.env.DATABASE_URL),
  };

  async getProfile(): Promise<BusinessProfile> {
    const profile = await prisma.marketingBusinessProfile.findFirst({
      where: { id: DEFAULT_PROFILE_ID },
      orderBy: { updatedAt: 'desc' },
    });
    if (!profile) {
      return {
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
    }
    return mapBusinessProfile(profile);
  }

  async listCampaigns(): Promise<Campaign[]> {
    const rows = await prisma.marketingCampaign.findMany({ orderBy: { updatedAt: 'desc' } });
    return rows.map(mapCampaign);
  }

  async listExperiments(): Promise<Experiment[]> {
    const rows = await prisma.marketingExperiment.findMany({ orderBy: { updatedAt: 'desc' } });
    return rows.map(mapExperiment);
  }

  async listContentItems(): Promise<ContentItem[]> {
    const rows = await prisma.marketingContentItem.findMany({
      orderBy: [{ week: 'asc' }, { updatedAt: 'desc' }],
    });
    return rows.map(mapContentItem);
  }

  async listSeoPages(): Promise<SeoPage[]> {
    const rows = await prisma.marketingSeoPage.findMany({ orderBy: { updatedAt: 'desc' } });
    return rows.map(mapSeoPage);
  }

  async listKeywordClusters(): Promise<KeywordCluster[]> {
    const rows = await prisma.marketingKeywordCluster.findMany({ orderBy: { updatedAt: 'desc' } });
    return rows.map(mapKeywordCluster);
  }

  async listLifecycleFlows(): Promise<LifecycleFlow[]> {
    const rows = await prisma.marketingLifecycleFlow.findMany({
      include: {
        steps: { orderBy: { order: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map(mapLifecycleFlow);
  }

  async listPlanItems(): Promise<PlanItem[]> {
    const rows = await prisma.marketingPlanItem.findMany({ orderBy: { updatedAt: 'desc' } });
    return rows.map(mapPlanItem);
  }

  async listKpis(category: KpiCategory): Promise<KpiMetric[] | null> {
    const [
      activeCampaigns,
      runningExperiments,
      publishedContent,
      liveSeoPages,
      highPriorityKeywordClusters,
      totalPlanItems,
      completedPlanItems,
    ] = await Promise.all([
      prisma.marketingCampaign.count({ where: { status: 'active' } }),
      prisma.marketingExperiment.count({ where: { status: 'running' } }),
      prisma.marketingContentItem.count({ where: { status: 'published' } }),
      prisma.marketingSeoPage.count({ where: { status: 'live' } }),
      prisma.marketingKeywordCluster.count({ where: { priority: 'high' } }),
      prisma.marketingPlanItem.count(),
      prisma.marketingPlanItem.count({ where: { done: true } }),
    ]);

    const northStar: KpiMetric[] = [
      mkKpi('Active campaigns', activeCampaigns, 5, '📣'),
      mkKpi('Running experiments', runningExperiments, 3, '🧪'),
      mkKpi('Published content items', publishedContent, 20, '🗓️'),
    ];
    const acquisition: KpiMetric[] = [
      mkKpi('Live SEO pages', liveSeoPages, 10, '🔎'),
      mkKpi('High-priority keyword clusters', highPriorityKeywordClusters, 8, '🎯'),
      mkKpi('Active campaigns', activeCampaigns, 5, '📈'),
      mkKpi('Running experiments', runningExperiments, 3, '🧪'),
      mkKpi('Published content items', publishedContent, 20, '✍️'),
    ];
    const activation: KpiMetric[] = [
      mkKpi('Completed 90-day plan items', completedPlanItems, Math.max(totalPlanItems, 1), '✅'),
      mkKpi('Running experiments', runningExperiments, 3, '⚡'),
      mkKpi('Published content items', publishedContent, 20, '🚀'),
    ];
    const retention: KpiMetric[] = [
      mkKpi('Completed 90-day plan items', completedPlanItems, Math.max(totalPlanItems, 1), '🔁'),
      mkKpi('Live SEO pages', liveSeoPages, 10, '📚'),
      mkKpi('Active campaigns', activeCampaigns, 5, '📊'),
    ];

    if (category === 'north-star') return northStar;
    if (category === 'acquisition') return acquisition;
    if (category === 'activation') return activation;
    if (category === 'retention') return retention;
    return null;
  }

  async getIntakeResponses(): Promise<IntakeResponses> {
    const rows = await prisma.marketingIntakeResponse.findMany();
    const out: IntakeResponses = {};
    for (const row of rows) {
      out[row.questionId] = normalizeIntakeValue(row.value);
    }
    return out;
  }

  async updateProfile(patch: Partial<BusinessProfile>): Promise<BusinessProfile> {
    const saved = await prisma.marketingBusinessProfile.upsert({
      where: { id: DEFAULT_PROFILE_ID },
      create: {
        id: DEFAULT_PROFILE_ID,
        ...toDbBusinessProfilePatch(patch),
      },
      update: toDbBusinessProfilePatch(patch),
    });
    return mapBusinessProfile(saved);
  }

  async putIntakeResponses(patch: IntakeResponses): Promise<IntakeResponses> {
    await Promise.all(
      Object.entries(patch).map(([questionId, value]) =>
        prisma.marketingIntakeResponse.upsert({
          where: { questionId },
          create: { questionId, value: value as any },
          update: { value: value as any },
        }),
      ),
    );
    return this.getIntakeResponses();
  }

  async createCampaign(input: Omit<Campaign, 'id'>): Promise<Campaign> {
    const row = await prisma.marketingCampaign.create({ data: input as any });
    return mapCampaign(row);
  }

  async updateCampaign(id: string, patch: Partial<Campaign>): Promise<Campaign | null> {
    const updated = await updateById(() =>
      prisma.marketingCampaign.update({ where: { id }, data: patch as any }),
    );
    return updated ? mapCampaign(updated) : null;
  }

  async deleteCampaign(id: string): Promise<boolean> {
    return deleteById(() => prisma.marketingCampaign.delete({ where: { id } }));
  }

  async createExperiment(input: Omit<Experiment, 'id'>): Promise<Experiment> {
    const row = await prisma.marketingExperiment.create({ data: input as any });
    return mapExperiment(row);
  }

  async updateExperiment(id: string, patch: Partial<Experiment>): Promise<Experiment | null> {
    const updated = await updateById(() =>
      prisma.marketingExperiment.update({ where: { id }, data: patch as any }),
    );
    return updated ? mapExperiment(updated) : null;
  }

  async deleteExperiment(id: string): Promise<boolean> {
    return deleteById(() => prisma.marketingExperiment.delete({ where: { id } }));
  }

  async createContentItem(input: Omit<ContentItem, 'id'>): Promise<ContentItem> {
    const row = await prisma.marketingContentItem.create({
      data: toDbContentItemPayload(input) as any,
    });
    return mapContentItem(row);
  }

  async updateContentItem(id: string, patch: Partial<ContentItem>): Promise<ContentItem | null> {
    const updated = await updateById(() =>
      prisma.marketingContentItem.update({
        where: { id },
        data: toDbContentItemPayload(patch) as any,
      }),
    );
    return updated ? mapContentItem(updated) : null;
  }

  async deleteContentItem(id: string): Promise<boolean> {
    return deleteById(() => prisma.marketingContentItem.delete({ where: { id } }));
  }

  async createLifecycleFlow(input: Omit<LifecycleFlow, 'id'>): Promise<LifecycleFlow> {
    const row = await prisma.marketingLifecycleFlow.create({
      data: {
        name: input.name,
        segment: toDbSegment(input.segment),
        trigger: input.trigger,
        status: input.status,
        steps: {
          create: (input.steps ?? []).map((step, idx) => mapStepToCreate(step, idx)),
        },
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
    return mapLifecycleFlow(row);
  }

  async updateLifecycleFlow(id: string, patch: Partial<LifecycleFlow>): Promise<LifecycleFlow | null> {
    const existing = await prisma.marketingLifecycleFlow.findUnique({ where: { id } });
    if (!existing) return null;

    const row = await prisma.$transaction(async (tx) => {
      if (Array.isArray(patch.steps)) {
        await tx.marketingLifecycleStep.deleteMany({ where: { flowId: id } });
      }
      return tx.marketingLifecycleFlow.update({
        where: { id },
        data: {
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.segment !== undefined ? { segment: toDbSegment(patch.segment) } : {}),
          ...(patch.trigger !== undefined ? { trigger: patch.trigger } : {}),
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(Array.isArray(patch.steps)
            ? {
                steps: {
                  create: patch.steps.map((step, idx) => mapStepToCreate(step, idx)),
                },
              }
            : {}),
        },
        include: { steps: { orderBy: { order: 'asc' } } },
      });
    });

    return mapLifecycleFlow(row);
  }

  async deleteLifecycleFlow(id: string): Promise<boolean> {
    return deleteById(() => prisma.marketingLifecycleFlow.delete({ where: { id } }));
  }

  async createPlanItem(input: Omit<PlanItem, 'id'>): Promise<PlanItem> {
    const row = await prisma.marketingPlanItem.create({ data: input as any });
    return mapPlanItem(row);
  }

  async updatePlanItem(id: string, patch: Partial<PlanItem>): Promise<PlanItem | null> {
    const updated = await updateById(() =>
      prisma.marketingPlanItem.update({ where: { id }, data: patch as any }),
    );
    return updated ? mapPlanItem(updated) : null;
  }

  async deletePlanItem(id: string): Promise<boolean> {
    return deleteById(() => prisma.marketingPlanItem.delete({ where: { id } }));
  }

  async createSeoPage(input: Omit<SeoPage, 'id'>): Promise<SeoPage> {
    const row = await prisma.marketingSeoPage.create({
      data: {
        url: input.url,
        type: toDbSeoType(input.type),
        title: input.title,
        status: input.status,
        targetKeyword: input.targetKeyword,
      },
    });
    return mapSeoPage(row);
  }

  async updateSeoPage(id: string, patch: Partial<SeoPage>): Promise<SeoPage | null> {
    const updated = await updateById(() =>
      prisma.marketingSeoPage.update({
        where: { id },
        data: {
          ...(patch.url !== undefined ? { url: patch.url } : {}),
          ...(patch.type !== undefined ? { type: toDbSeoType(patch.type) } : {}),
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.targetKeyword !== undefined ? { targetKeyword: patch.targetKeyword } : {}),
        },
      }),
    );
    return updated ? mapSeoPage(updated) : null;
  }

  async deleteSeoPage(id: string): Promise<boolean> {
    return deleteById(() => prisma.marketingSeoPage.delete({ where: { id } }));
  }

  async createKeywordCluster(input: Omit<KeywordCluster, 'id'>): Promise<KeywordCluster> {
    const row = await prisma.marketingKeywordCluster.create({
      data: {
        cluster: input.cluster,
        type: input.type,
        priority: input.priority,
        keywords: input.keywords as any,
      },
    });
    return mapKeywordCluster(row);
  }

  async updateKeywordCluster(
    id: string,
    patch: Partial<KeywordCluster>,
  ): Promise<KeywordCluster | null> {
    const updated = await updateById(() =>
      prisma.marketingKeywordCluster.update({
        where: { id },
        data: {
          ...(patch.cluster !== undefined ? { cluster: patch.cluster } : {}),
          ...(patch.type !== undefined ? { type: patch.type } : {}),
          ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
          ...(patch.keywords !== undefined ? { keywords: patch.keywords as any } : {}),
        },
      }),
    );
    return updated ? mapKeywordCluster(updated) : null;
  }

  async deleteKeywordCluster(id: string): Promise<boolean> {
    return deleteById(() => prisma.marketingKeywordCluster.delete({ where: { id } }));
  }
}

async function updateById<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

async function deleteById(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch (error) {
    if (isNotFoundError(error)) return false;
    throw error;
  }
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2025'
  );
}

function mapBusinessProfile(row: any): BusinessProfile {
  return {
    primaryGrowthFocus: normalizePrimaryGrowthFocus(row.primaryGrowthFocus),
    biggestBottleneck: normalizeBiggestBottleneck(row.biggestBottleneck),
    monthlyBudget: row.monthlyBudget ?? 0,
    allocatedBudget: row.allocatedBudget ?? 0,
    targetCities: row.targetCities ?? [],
    bestPerforming: row.bestPerforming ?? '',
    topMemberPersona: row.topPatientPersona ?? '',
    topReasonMemberJoins: row.topReasonPatientChooses ?? '',
    topReasonMemberSubscribes: row.topReasonProviderJoins ?? '',
    competitors: row.competitors ?? [],
    founderLedBrand: !!row.founderLedBrand,
  };
}

function toDbBusinessProfilePatch(patch: Partial<BusinessProfile>): Record<string, unknown> {
  return {
    ...(patch.primaryGrowthFocus !== undefined
      ? { primaryGrowthFocus: toDbPrimaryGrowthFocus(patch.primaryGrowthFocus) }
      : {}),
    ...(patch.biggestBottleneck !== undefined
      ? { biggestBottleneck: toDbBiggestBottleneck(patch.biggestBottleneck) }
      : {}),
    ...(patch.monthlyBudget !== undefined ? { monthlyBudget: patch.monthlyBudget } : {}),
    ...(patch.allocatedBudget !== undefined ? { allocatedBudget: patch.allocatedBudget } : {}),
    ...(patch.targetCities !== undefined ? { targetCities: patch.targetCities } : {}),
    ...(patch.bestPerforming !== undefined ? { bestPerforming: patch.bestPerforming } : {}),
    ...(patch.topMemberPersona !== undefined ? { topPatientPersona: patch.topMemberPersona } : {}),
    ...(patch.topReasonMemberJoins !== undefined
      ? { topReasonPatientChooses: patch.topReasonMemberJoins }
      : {}),
    ...(patch.topReasonMemberSubscribes !== undefined
      ? { topReasonProviderJoins: patch.topReasonMemberSubscribes }
      : {}),
    ...(patch.competitors !== undefined ? { competitors: patch.competitors } : {}),
    ...(patch.founderLedBrand !== undefined ? { founderLedBrand: patch.founderLedBrand } : {}),
  };
}

function mapCampaign(row: any): Campaign {
  return {
    id: row.id,
    name: row.name,
    objective: row.objective,
    channel: row.channel,
    audience: row.audience,
    budget: row.budget,
    duration: row.duration,
    kpi: row.kpi,
    status: row.status,
    headline: Array.isArray(row.headline) ? row.headline : [],
    description: Array.isArray(row.description) ? row.description : [],
  };
}

function mapExperiment(row: any): Experiment {
  return {
    id: row.id,
    name: row.name,
    hypothesis: row.hypothesis,
    channel: row.channel,
    control: row.control,
    variant: row.variant,
    metric: row.metric,
    startDate: row.startDate,
    endDate: row.endDate,
    result: row.result ?? undefined,
    winner: row.winner ?? undefined,
    status: row.status,
    lift: row.lift ?? undefined,
  };
}

function mapContentItem(row: any): ContentItem {
  return {
    id: row.id,
    week: row.week,
    day: row.day,
    platform: row.platform,
    pillar: fromDbPillar(row.pillar),
    title: row.title,
    format: row.format,
    status: row.status,
  };
}

function toDbContentItemPayload(payload: Partial<Omit<ContentItem, 'id'>>): Record<string, unknown> {
  return {
    ...(payload.week !== undefined ? { week: payload.week } : {}),
    ...(payload.day !== undefined ? { day: payload.day } : {}),
    ...(payload.platform !== undefined ? { platform: payload.platform } : {}),
    ...(payload.pillar !== undefined ? { pillar: payload.pillar } : {}),
    ...(payload.title !== undefined ? { title: payload.title } : {}),
    ...(payload.format !== undefined ? { format: payload.format } : {}),
    ...(payload.status !== undefined ? { status: payload.status } : {}),
  };
}

function mapSeoPage(row: any): SeoPage {
  return {
    id: row.id,
    url: row.url,
    type: fromDbSeoType(row.type),
    title: row.title,
    status: row.status,
    targetKeyword: row.targetKeyword,
  };
}

function mapKeywordCluster(row: any): KeywordCluster {
  return {
    id: row.id,
    cluster: row.cluster,
    type: fromDbKeywordType(row.type),
    priority: row.priority,
    keywords: Array.isArray(row.keywords) ? (row.keywords as any) : [],
  };
}

function mapLifecycleFlow(row: any): LifecycleFlow {
  return {
    id: row.id,
    name: row.name,
    segment: fromDbSegment(row.segment),
    trigger: row.trigger,
    status: row.status,
    steps: Array.isArray(row.steps)
      ? row.steps.map((s: any) => ({
          day: s.day,
          channel: s.channel,
          message: s.message,
          goal: s.goal,
        }))
      : [],
  };
}

function mapPlanItem(row: any): PlanItem {
  return {
    id: row.id,
    phase: row.phase,
    category: row.category,
    task: row.task,
    owner: row.owner,
    done: !!row.done,
  };
}

function mapStepToCreate(step: LifecycleFlowStep, idx: number) {
  return {
    day: step.day,
    channel: step.channel,
    message: step.message,
    goal: step.goal,
    order: idx,
  };
}

function normalizeIntakeValue(value: unknown): string | string[] | boolean | number {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === 'string') as string[];
  }
  return '';
}

function normalizePrimaryGrowthFocus(
  value: string,
): BusinessProfile['primaryGrowthFocus'] {
  if (value === 'members' || value === 'subscribers' || value === 'both') return value;
  if (value === 'patients') return 'members';
  if (value === 'providers') return 'subscribers';
  return 'both';
}

function toDbPrimaryGrowthFocus(value: BusinessProfile['primaryGrowthFocus']): string {
  if (value === 'members') return 'patients';
  if (value === 'subscribers') return 'providers';
  return 'both';
}

function normalizeBiggestBottleneck(
  value: string,
): BusinessProfile['biggestBottleneck'] {
  if (
    value === 'acquisition' ||
    value === 'activation' ||
    value === 'subscription-conversion'
  ) {
    return value;
  }
  if (value === 'demand') return 'acquisition';
  if (value === 'supply') return 'subscription-conversion';
  return 'activation';
}

function toDbBiggestBottleneck(value: BusinessProfile['biggestBottleneck']): string {
  if (value === 'acquisition') return 'demand';
  if (value === 'subscription-conversion') return 'supply';
  return 'activation';
}

function fromDbPillar(value: string): ContentItem['pillar'] {
  if (
    value === 'budgeting' ||
    value === 'saving-investing' ||
    value === 'product-education' ||
    value === 'social-proof' ||
    value === 'family-finance'
  ) {
    return value;
  }
  if (value === 'patient-education') return 'budgeting';
  if (value === 'provider-spotlight') return 'saving-investing';
  return 'family-finance';
}

function fromDbSeoType(value: string): SeoPage['type'] {
  if (
    value === 'landing' ||
    value === 'calculator' ||
    value === 'guide' ||
    value === 'blog' ||
    value === 'comparison'
  ) {
    return value;
  }
  if (value === 'city-specialty') return 'landing';
  if (value === 'condition') return 'guide';
  return 'blog';
}

function toDbSeoType(value: SeoPage['type']): string {
  if (value === 'landing') return 'city-specialty';
  if (value === 'guide') return 'condition';
  if (value === 'calculator') return 'calculator';
  if (value === 'blog') return 'blog';
  if (value === 'comparison') return 'comparison';
  return 'blog';
}

function fromDbKeywordType(value: string): KeywordCluster['type'] {
  if (
    value === 'transactional' ||
    value === 'informational' ||
    value === 'comparison' ||
    value === 'calculator'
  ) {
    return value;
  }
  return 'calculator';
}

function fromDbSegment(value: string): LifecycleFlow['segment'] {
  if (value === 'member' || value === 'subscriber') return value;
  if (value === 'patient') return 'member';
  return 'subscriber';
}

function toDbSegment(value: LifecycleFlow['segment']): string {
  if (value === 'member') return 'patient';
  if (value === 'subscriber') return 'provider';
  throw new Error(`Unsupported lifecycle segment: ${String(value)}`);
}

function mkKpi(label: string, value: number, target: number, icon: string): KpiMetric {
  const status: KpiMetric['status'] =
    value >= target ? 'on-track' : value >= Math.ceil(target * 0.7) ? 'at-risk' : 'behind';
  return {
    label,
    value,
    target: String(target),
    trend: 'Live from database',
    status,
    icon,
  };
}

function maskDatabaseUrl(url: string | undefined): string {
  if (!url) return '<unset DATABASE_URL>';
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '***';
    if (parsed.username) parsed.username = `${parsed.username.slice(0, 1)}***`;
    return parsed.toString();
  } catch {
    return '<invalid DATABASE_URL>';
  }
}

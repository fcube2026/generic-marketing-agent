/**
 * Postgres-backed `DataSource` for the marketing-agent self-contained backend.
 *
 * Uses the shared `@curex24/database` Prisma client and the `marketing_*`
 * tables already defined in `packages/database/prisma/schema.prisma`. Selected
 * by `getActiveDataSource()` whenever `DATABASE_URL` is set; otherwise the
 * app falls back to the in-memory `MockDataSource` so local dev with no DB
 * still works.
 *
 * Mapping notes:
 *   - `BusinessProfile` is a singleton row keyed by id `"default"`.
 *   - `LifecycleFlow.steps` are stored in the related `MarketingLifecycleStep`
 *     table and ordered by their `order` column on read.
 *   - `IntakeResponses` is keyed by `questionId` (one row per question).
 *   - KPIs live in the `MarketingKpi` table grouped by `category`.
 */

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
import type {
  DataSource,
  DataSourceStatus,
  IntakeResponses,
  KpiCategory,
} from './types';

const PROFILE_ID = 'default';

const DEFAULT_PROFILE: BusinessProfile = {
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

function rowToProfile(row: any): BusinessProfile {
  return {
    primaryGrowthFocus: row.primaryGrowthFocus as BusinessProfile['primaryGrowthFocus'],
    biggestBottleneck: row.biggestBottleneck as BusinessProfile['biggestBottleneck'],
    monthlyBudget: row.monthlyBudget,
    allocatedBudget: row.allocatedBudget,
    targetCities: row.targetCities ?? [],
    bestPerforming: row.bestPerforming ?? '',
    topPatientPersona: row.topPatientPersona ?? '',
    topReasonPatientChooses: row.topReasonPatientChooses ?? '',
    topReasonProviderJoins: row.topReasonProviderJoins ?? '',
    competitors: row.competitors ?? [],
    founderLedBrand: row.founderLedBrand ?? false,
  };
}

function rowToCampaign(row: any): Campaign {
  return {
    id: row.id,
    name: row.name,
    objective: row.objective,
    channel: row.channel,
    audience: row.audience,
    budget: row.budget,
    duration: row.duration,
    kpi: row.kpi,
    status: row.status as Campaign['status'],
    headline: row.headline ?? [],
    description: row.description ?? [],
  };
}

function rowToExperiment(row: any): Experiment {
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
    winner: (row.winner ?? undefined) as Experiment['winner'],
    status: row.status as Experiment['status'],
    lift: row.lift ?? undefined,
  };
}

function rowToContentItem(row: any): ContentItem {
  return {
    id: row.id,
    week: row.week,
    day: row.day,
    platform: row.platform,
    pillar: row.pillar as ContentItem['pillar'],
    title: row.title,
    format: row.format,
    status: row.status as ContentItem['status'],
  };
}

function rowToSeoPage(row: any): SeoPage {
  return {
    id: row.id,
    url: row.url,
    type: row.type as SeoPage['type'],
    title: row.title,
    status: row.status as SeoPage['status'],
    targetKeyword: row.targetKeyword,
  };
}

function rowToKeywordCluster(row: any): KeywordCluster {
  return {
    id: row.id,
    cluster: row.cluster,
    type: row.type as KeywordCluster['type'],
    priority: row.priority as KeywordCluster['priority'],
    keywords: (row.keywords as KeywordCluster['keywords']) ?? [],
  };
}

function rowToLifecycleFlow(row: any): LifecycleFlow {
  const steps = (row.steps ?? [])
    .slice()
    .sort((a: any, b: any) => a.order - b.order)
    .map((s: any): LifecycleFlowStep => ({
      day: s.day,
      channel: s.channel,
      message: s.message,
      goal: s.goal,
    }));
  return {
    id: row.id,
    name: row.name,
    segment: row.segment as LifecycleFlow['segment'],
    trigger: row.trigger,
    steps,
    status: row.status as LifecycleFlow['status'],
  };
}

function rowToPlanItem(row: any): PlanItem {
  return {
    id: row.id,
    phase: row.phase as PlanItem['phase'],
    category: row.category,
    task: row.task,
    owner: row.owner,
    done: row.done,
  };
}

function rowToKpi(row: any): KpiMetric {
  return {
    label: row.label,
    value: row.value,
    target: row.target,
    trend: row.trend,
    status: row.status as KpiMetric['status'],
    icon: row.icon ?? '',
  };
}

export class PrismaDataSource implements DataSource {
  readonly status: DataSourceStatus;

  constructor() {
    let detail: string | undefined;
    try {
      const url = process.env.DATABASE_URL ?? '';
      // Strip credentials before surfacing to the UI banner.
      const sanitized = url.replace(/\/\/[^@]+@/, '//***@');
      detail = sanitized || undefined;
    } catch {
      detail = undefined;
    }
    this.status = {
      kind: 'prisma',
      label: 'Postgres (Prisma)',
      detail,
    };
  }

  // ─── Profile (singleton) ─────────────────────────────────────────────
  async getProfile(): Promise<BusinessProfile> {
    const row = await prisma.marketingBusinessProfile.findUnique({
      where: { id: PROFILE_ID },
    });
    return row ? rowToProfile(row) : DEFAULT_PROFILE;
  }

  async updateProfile(patch: Partial<BusinessProfile>): Promise<BusinessProfile> {
    const merged: BusinessProfile = { ...DEFAULT_PROFILE, ...(await this.getProfile()), ...patch };
    const row = await prisma.marketingBusinessProfile.upsert({
      where: { id: PROFILE_ID },
      create: { id: PROFILE_ID, ...merged },
      update: { ...merged },
    });
    return rowToProfile(row);
  }

  // ─── Intake responses (one row per questionId) ───────────────────────
  async getIntakeResponses(): Promise<IntakeResponses> {
    const rows = await prisma.marketingIntakeResponse.findMany();
    const out: IntakeResponses = {};
    for (const r of rows) {
      out[r.questionId] = r.value as IntakeResponses[string];
    }
    return out;
  }

  async putIntakeResponses(patch: IntakeResponses): Promise<IntakeResponses> {
    for (const [questionId, value] of Object.entries(patch)) {
      await prisma.marketingIntakeResponse.upsert({
        where: { questionId },
        create: { questionId, value: value as any },
        update: { value: value as any },
      });
    }
    return this.getIntakeResponses();
  }

  // ─── Campaigns ───────────────────────────────────────────────────────
  async listCampaigns(): Promise<Campaign[]> {
    const rows = await prisma.marketingCampaign.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map(rowToCampaign);
  }
  async createCampaign(input: Omit<Campaign, 'id'>): Promise<Campaign> {
    const row = await prisma.marketingCampaign.create({
      data: {
        name: input.name,
        objective: input.objective,
        channel: input.channel,
        audience: input.audience,
        budget: input.budget,
        duration: input.duration,
        kpi: input.kpi,
        status: input.status,
        headline: input.headline ?? [],
        description: input.description ?? [],
      },
    });
    return rowToCampaign(row);
  }
  async updateCampaign(id: string, patch: Partial<Campaign>): Promise<Campaign | null> {
    try {
      const { id: _ignored, ...rest } = patch;
      void _ignored;
      const row = await prisma.marketingCampaign.update({ where: { id }, data: rest });
      return rowToCampaign(row);
    } catch {
      return null;
    }
  }
  async deleteCampaign(id: string): Promise<boolean> {
    try {
      await prisma.marketingCampaign.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  // ─── Experiments ─────────────────────────────────────────────────────
  async listExperiments(): Promise<Experiment[]> {
    const rows = await prisma.marketingExperiment.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map(rowToExperiment);
  }
  async createExperiment(input: Omit<Experiment, 'id'>): Promise<Experiment> {
    const row = await prisma.marketingExperiment.create({ data: { ...input } });
    return rowToExperiment(row);
  }
  async updateExperiment(id: string, patch: Partial<Experiment>): Promise<Experiment | null> {
    try {
      const { id: _ignored, ...rest } = patch;
      void _ignored;
      const row = await prisma.marketingExperiment.update({ where: { id }, data: rest });
      return rowToExperiment(row);
    } catch {
      return null;
    }
  }
  async deleteExperiment(id: string): Promise<boolean> {
    try {
      await prisma.marketingExperiment.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  // ─── Content items ───────────────────────────────────────────────────
  async listContentItems(): Promise<ContentItem[]> {
    const rows = await prisma.marketingContentItem.findMany({ orderBy: [{ week: 'asc' }, { createdAt: 'asc' }] });
    return rows.map(rowToContentItem);
  }
  async createContentItem(input: Omit<ContentItem, 'id'>): Promise<ContentItem> {
    const row = await prisma.marketingContentItem.create({ data: { ...input } });
    return rowToContentItem(row);
  }
  async updateContentItem(id: string, patch: Partial<ContentItem>): Promise<ContentItem | null> {
    try {
      const { id: _ignored, ...rest } = patch;
      void _ignored;
      const row = await prisma.marketingContentItem.update({ where: { id }, data: rest });
      return rowToContentItem(row);
    } catch {
      return null;
    }
  }
  async deleteContentItem(id: string): Promise<boolean> {
    try {
      await prisma.marketingContentItem.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  // ─── SEO pages ───────────────────────────────────────────────────────
  async listSeoPages(): Promise<SeoPage[]> {
    const rows = await prisma.marketingSeoPage.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map(rowToSeoPage);
  }
  async createSeoPage(input: Omit<SeoPage, 'id'>): Promise<SeoPage> {
    const row = await prisma.marketingSeoPage.create({ data: { ...input } });
    return rowToSeoPage(row);
  }
  async updateSeoPage(id: string, patch: Partial<SeoPage>): Promise<SeoPage | null> {
    try {
      const { id: _ignored, ...rest } = patch;
      void _ignored;
      const row = await prisma.marketingSeoPage.update({ where: { id }, data: rest });
      return rowToSeoPage(row);
    } catch {
      return null;
    }
  }
  async deleteSeoPage(id: string): Promise<boolean> {
    try {
      await prisma.marketingSeoPage.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  // ─── Keyword clusters ────────────────────────────────────────────────
  async listKeywordClusters(): Promise<KeywordCluster[]> {
    const rows = await prisma.marketingKeywordCluster.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map(rowToKeywordCluster);
  }
  async createKeywordCluster(input: Omit<KeywordCluster, 'id'>): Promise<KeywordCluster> {
    const row = await prisma.marketingKeywordCluster.create({
      data: {
        cluster: input.cluster,
        type: input.type,
        priority: input.priority,
        keywords: (input.keywords ?? []) as any,
      },
    });
    return rowToKeywordCluster(row);
  }
  async updateKeywordCluster(id: string, patch: Partial<KeywordCluster>): Promise<KeywordCluster | null> {
    try {
      const { id: _ignored, keywords, ...rest } = patch;
      void _ignored;
      const data: any = { ...rest };
      if (keywords !== undefined) data.keywords = keywords as any;
      const row = await prisma.marketingKeywordCluster.update({ where: { id }, data });
      return rowToKeywordCluster(row);
    } catch {
      return null;
    }
  }
  async deleteKeywordCluster(id: string): Promise<boolean> {
    try {
      await prisma.marketingKeywordCluster.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  // ─── Lifecycle flows (with steps) ────────────────────────────────────
  async listLifecycleFlows(): Promise<LifecycleFlow[]> {
    const rows = await prisma.marketingLifecycleFlow.findMany({
      orderBy: { createdAt: 'asc' },
      include: { steps: true },
    });
    return rows.map(rowToLifecycleFlow);
  }
  async createLifecycleFlow(input: Omit<LifecycleFlow, 'id'>): Promise<LifecycleFlow> {
    const row = await prisma.marketingLifecycleFlow.create({
      data: {
        name: input.name,
        segment: input.segment,
        trigger: input.trigger,
        status: input.status,
        steps: {
          create: (input.steps ?? []).map((s, idx) => ({
            day: s.day,
            channel: s.channel,
            message: s.message,
            goal: s.goal,
            order: idx,
          })),
        },
      },
      include: { steps: true },
    });
    return rowToLifecycleFlow(row);
  }
  async updateLifecycleFlow(id: string, patch: Partial<LifecycleFlow>): Promise<LifecycleFlow | null> {
    try {
      const { id: _ignored, steps, ...rest } = patch;
      void _ignored;
      // If steps are supplied, replace the whole step set (matches mock semantics).
      if (steps !== undefined) {
        await prisma.marketingLifecycleStep.deleteMany({ where: { flowId: id } });
        await prisma.marketingLifecycleStep.createMany({
          data: steps.map((s, idx) => ({
            flowId: id,
            day: s.day,
            channel: s.channel,
            message: s.message,
            goal: s.goal,
            order: idx,
          })),
        });
      }
      const row = await prisma.marketingLifecycleFlow.update({
        where: { id },
        data: rest,
        include: { steps: true },
      });
      return rowToLifecycleFlow(row);
    } catch {
      return null;
    }
  }
  async deleteLifecycleFlow(id: string): Promise<boolean> {
    try {
      await prisma.marketingLifecycleFlow.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  // ─── Plan items ──────────────────────────────────────────────────────
  async listPlanItems(): Promise<PlanItem[]> {
    const rows = await prisma.marketingPlanItem.findMany({ orderBy: [{ phase: 'asc' }, { createdAt: 'asc' }] });
    return rows.map(rowToPlanItem);
  }
  async createPlanItem(input: Omit<PlanItem, 'id'>): Promise<PlanItem> {
    const row = await prisma.marketingPlanItem.create({ data: { ...input } });
    return rowToPlanItem(row);
  }
  async updatePlanItem(id: string, patch: Partial<PlanItem>): Promise<PlanItem | null> {
    try {
      const { id: _ignored, ...rest } = patch;
      void _ignored;
      const row = await prisma.marketingPlanItem.update({ where: { id }, data: rest });
      return rowToPlanItem(row);
    } catch {
      return null;
    }
  }
  async deletePlanItem(id: string): Promise<boolean> {
    try {
      await prisma.marketingPlanItem.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  // ─── KPIs (read-only over the route layer) ───────────────────────────
  async listKpis(category: KpiCategory): Promise<KpiMetric[] | null> {
    const valid: KpiCategory[] = ['north-star', 'acquisition', 'activation', 'retention'];
    if (!valid.includes(category)) return null;
    const rows = await prisma.marketingKpi.findMany({
      where: { category },
      orderBy: { order: 'asc' },
    });
    return rows.map(rowToKpi);
  }
}

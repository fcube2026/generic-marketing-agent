/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '../api';
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
} from '../types';

// ─── Business Profile ────────────────────────────────────────────────────────

export async function getBusinessProfile(): Promise<BusinessProfile> {
  const { data } = await api.get('/marketing/profile');
  return normalizeProfile(data);
}

export async function updateBusinessProfile(
  patch: Partial<BusinessProfile>,
): Promise<BusinessProfile> {
  const { data } = await api.put('/marketing/profile', patch);
  return normalizeProfile(data);
}

function normalizeProfile(raw: any): BusinessProfile {
  return {
    primaryGrowthFocus: raw.primaryGrowthFocus ?? 'both',
    biggestBottleneck: raw.biggestBottleneck ?? 'demand',
    monthlyBudget: raw.monthlyBudget ?? 0,
    allocatedBudget: raw.allocatedBudget ?? 0,
    targetCities: raw.targetCities ?? [],
    bestPerforming: raw.bestPerforming ?? '',
    topCustomerPersona: raw.topCustomerPersona ?? raw.topPatientPersona ?? '',
    topReasonCustomerChooses: raw.topReasonCustomerChooses ?? raw.topReasonPatientChooses ?? '',
    topReasonPartnerJoins: raw.topReasonPartnerJoins ?? raw.topReasonProviderJoins ?? '',
    competitors: raw.competitors ?? [],
    founderLedBrand: !!raw.founderLedBrand,
  };
}

// ─── Campaigns ───────────────────────────────────────────────────────────────

export async function listCampaigns(): Promise<Campaign[]> {
  const { data } = await api.get('/marketing/campaigns');
  return (data ?? []).map(normalizeCampaign);
}

export async function createCampaign(
  payload: Omit<Campaign, 'id'>,
): Promise<Campaign> {
  const { data } = await api.post('/marketing/campaigns', payload);
  return normalizeCampaign(data);
}

export async function updateCampaign(
  id: string,
  patch: Partial<Campaign>,
): Promise<Campaign> {
  const { data } = await api.put(`/marketing/campaigns/${id}`, patch);
  return normalizeCampaign(data);
}

export async function deleteCampaign(id: string): Promise<void> {
  await api.delete(`/marketing/campaigns/${id}`);
}

function normalizeCampaign(raw: any): Campaign {
  return {
    id: (raw as any).id,
    name: raw.name,
    objective: raw.objective,
    channel: raw.channel,
    audience: raw.audience,
    budget: raw.budget,
    duration: raw.duration,
    kpi: raw.kpi,
    status: raw.status,
    headline: raw.headline ?? [],
    description: raw.description ?? [],
  };
}

// ─── Experiments ─────────────────────────────────────────────────────────────

export async function listExperiments(): Promise<Experiment[]> {
  const { data } = await api.get('/marketing/experiments');
  return (data ?? []).map(normalizeExperiment);
}

export async function createExperiment(
  payload: Omit<Experiment, 'id'>,
): Promise<Experiment> {
  const { data } = await api.post('/marketing/experiments', payload);
  return normalizeExperiment(data);
}

export async function updateExperiment(
  id: string,
  patch: Partial<Experiment>,
): Promise<Experiment> {
  const { data } = await api.put(`/marketing/experiments/${id}`, patch);
  return normalizeExperiment(data);
}

export async function deleteExperiment(id: string): Promise<void> {
  await api.delete(`/marketing/experiments/${id}`);
}

function normalizeExperiment(raw: any): Experiment {
  return {
    id: (raw as any).id,
    name: raw.name,
    hypothesis: raw.hypothesis,
    channel: raw.channel,
    control: raw.control,
    variant: raw.variant,
    metric: raw.metric,
    startDate: raw.startDate,
    endDate: raw.endDate,
    result: raw.result ?? undefined,
    winner: raw.winner ?? undefined,
    status: raw.status,
    lift: raw.lift ?? undefined,
  };
}

// ─── Content Calendar ────────────────────────────────────────────────────────

export async function listContentItems(): Promise<ContentItem[]> {
  const { data } = await api.get('/marketing/content-calendar');
  return (data ?? []).map(normalizeContentItem);
}

export async function createContentItem(
  payload: Omit<ContentItem, 'id'>,
): Promise<ContentItem> {
  const { data } = await api.post('/marketing/content-calendar', payload);
  return normalizeContentItem(data);
}

export async function updateContentItem(
  id: string,
  patch: Partial<ContentItem>,
): Promise<ContentItem> {
  const { data } = await api.put(`/marketing/content-calendar/${id}`, patch);
  return normalizeContentItem(data);
}

export async function deleteContentItem(id: string): Promise<void> {
  await api.delete(`/marketing/content-calendar/${id}`);
}

function normalizeContentItem(raw: any): ContentItem {
  return {
    id: (raw as any).id,
    week: raw.week,
    day: raw.day,
    platform: raw.platform,
    pillar: raw.pillar,
    title: raw.title,
    format: raw.format,
    status: raw.status,
  };
}

// ─── SEO ─────────────────────────────────────────────────────────────────────

export async function listSeoPages(): Promise<SeoPage[]> {
  const { data } = await api.get('/marketing/seo/pages');
  return (data ?? []).map(normalizeSeoPage);
}

export async function upsertSeoPage(
  payload: Omit<SeoPage, 'id'>,
): Promise<SeoPage> {
  const { data } = await api.post('/marketing/seo/pages', payload);
  return normalizeSeoPage(data);
}

function normalizeSeoPage(raw: any): SeoPage {
  return {
    id: (raw as any).id,
    url: raw.url,
    type: raw.type,
    title: raw.title,
    status: raw.status,
    targetKeyword: raw.targetKeyword,
  };
}

export async function listKeywordClusters(): Promise<KeywordCluster[]> {
  const { data } = await api.get('/marketing/seo/keyword-clusters');
  return (data ?? []).map(normalizeKeywordCluster);
}

export async function createKeywordCluster(
  payload: Omit<KeywordCluster, 'id'>,
): Promise<KeywordCluster> {
  const { data } = await api.post('/marketing/seo/keyword-clusters', payload);
  return normalizeKeywordCluster(data);
}

function normalizeKeywordCluster(raw: any): KeywordCluster {
  return {
    id: (raw as any).id,
    cluster: raw.cluster,
    type: raw.type,
    priority: raw.priority,
    keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
  };
}

// ─── Lifecycle Flows ─────────────────────────────────────────────────────────

export async function listLifecycleFlows(): Promise<LifecycleFlow[]> {
  const { data } = await api.get('/marketing/lifecycle-flows');
  return (data ?? []).map(normalizeLifecycleFlow);
}

export async function createLifecycleFlow(
  payload: Omit<LifecycleFlow, 'id'>,
): Promise<LifecycleFlow> {
  const { data } = await api.post('/marketing/lifecycle-flows', payload);
  return normalizeLifecycleFlow(data);
}

function normalizeLifecycleFlow(raw: any): LifecycleFlow {
  return {
    id: (raw as any).id,
    name: raw.name,
    segment: raw.segment,
    trigger: raw.trigger,
    status: raw.status,
    steps: (raw.steps ?? []).map((s: any) => ({
      day: s.day,
      channel: s.channel,
      message: s.message,
      goal: s.goal,
    })),
  };
}

// ─── 90-Day Plan ─────────────────────────────────────────────────────────────

export async function listPlanItems(): Promise<PlanItem[]> {
  const { data } = await api.get('/marketing/plan-items');
  return (data ?? []).map(normalizePlanItem);
}

export async function createPlanItem(
  payload: Omit<PlanItem, 'id'>,
): Promise<PlanItem> {
  const { data } = await api.post('/marketing/plan-items', payload);
  return normalizePlanItem(data);
}

export async function updatePlanItem(
  id: string,
  patch: Partial<PlanItem>,
): Promise<PlanItem> {
  const { data } = await api.patch(`/marketing/plan-items/${id}`, patch);
  return normalizePlanItem(data);
}

function normalizePlanItem(raw: any): PlanItem {
  return {
    id: (raw as any).id,
    phase: raw.phase,
    category: raw.category,
    task: raw.task,
    owner: raw.owner,
    done: !!raw.done,
  };
}

// ─── Intake Responses ────────────────────────────────────────────────────────

export async function getIntakeResponses(): Promise<
  Record<string, string | string[] | boolean | number>
> {
  const { data } = await api.get('/marketing/intake-responses');
  return data ?? {};
}

export async function saveIntakeResponses(
  values: Record<string, string | string[] | boolean | number>,
): Promise<Record<string, string | string[] | boolean | number>> {
  const { data } = await api.put('/marketing/intake-responses', values);
  return data ?? {};
}

// ─── KPIs ────────────────────────────────────────────────────────────────────

export async function getNorthStarKpis(): Promise<KpiMetric[]> {
  const { data } = await api.get('/marketing/kpis/north-star');
  return data ?? [];
}

export async function getAcquisitionKpis(): Promise<KpiMetric[]> {
  const { data } = await api.get('/marketing/kpis/acquisition');
  return data ?? [];
}

export async function getActivationKpis(): Promise<KpiMetric[]> {
  const { data } = await api.get('/marketing/kpis/activation');
  return data ?? [];
}

export async function getRetentionKpis(): Promise<KpiMetric[]> {
  const { data } = await api.get('/marketing/kpis/retention');
  return data ?? [];
}

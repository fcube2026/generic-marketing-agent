// Shared TypeScript types for marketing-agent data backed by the API.
// Static catalog/UI types stay in lib/data.ts.

export interface BusinessProfile {
  primaryGrowthFocus: 'patients' | 'providers' | 'both';
  biggestBottleneck: 'supply' | 'demand' | 'activation';
  monthlyBudget: number;
  allocatedBudget: number;
  targetCities: string[];
  bestPerforming: string;
  topPatientPersona: string;
  topReasonPatientChooses: string;
  topReasonProviderJoins: string;
  competitors: string[];
  founderLedBrand: boolean;
}

export interface KpiMetric {
  label: string;
  value: string | number;
  target: string;
  trend: string;
  status: 'on-track' | 'at-risk' | 'behind';
  icon: string;
}

export type ContentPillar =
  | 'patient-education'
  | 'provider-spotlight'
  | 'product-education'
  | 'social-proof'
  | 'local-health';

export interface ContentItem {
  id: string;
  week: number;
  day: string;
  platform: string;
  pillar: ContentPillar;
  title: string;
  format: string;
  status: 'planned' | 'in-progress' | 'ready' | 'published';
}

export interface Campaign {
  id: string;
  name: string;
  objective: string;
  channel: string;
  audience: string;
  budget: string;
  duration: string;
  kpi: string;
  status: 'active' | 'planned' | 'completed' | 'paused';
  headline: string[];
  description: string[];
}

export interface KeywordCluster {
  id: string;
  cluster: string;
  type: 'transactional' | 'informational' | 'comparison' | 'provider-side';
  priority: 'high' | 'medium' | 'low';
  keywords: Array<{ keyword: string; volume: string; difficulty: string }>;
}

export interface SeoPage {
  id: string;
  url: string;
  type: 'city-specialty' | 'condition' | 'blog' | 'comparison';
  title: string;
  status: 'live' | 'in-progress' | 'planned';
  targetKeyword: string;
}

export interface LifecycleFlowStep {
  day: number;
  channel: string;
  message: string;
  goal: string;
}

export interface LifecycleFlow {
  id: string;
  name: string;
  segment: 'patient' | 'provider';
  trigger: string;
  steps: LifecycleFlowStep[];
  status: 'active' | 'draft' | 'paused';
}

export type ExperimentStatus = 'running' | 'completed' | 'planned' | 'paused';

export interface Experiment {
  id: string;
  name: string;
  hypothesis: string;
  channel: string;
  control: string;
  variant: string;
  metric: string;
  startDate: string;
  endDate: string;
  result?: string;
  winner?: 'control' | 'variant' | 'no-difference';
  status: ExperimentStatus;
  lift?: string;
}

export interface PlanItem {
  id: string;
  phase: '1-30' | '31-60' | '61-90';
  category: string;
  task: string;
  owner: string;
  done: boolean;
}

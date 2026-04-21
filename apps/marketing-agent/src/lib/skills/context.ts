/**
 * Hydrates a skill run with curex24-specific context — business profile,
 * latest KPIs, top campaigns / experiments / SEO pages — so the model's
 * output is grounded in the org's real data, not generic web wisdom.
 *
 * Each lookup is best-effort: if any individual fetch fails we still return
 * the rest, so a partial-data org (e.g. a fresh signup) still gets a useful
 * run.
 */

import type { SkillTool } from './types';
import {
  getBusinessProfile,
  getNorthStarKpis,
  getAcquisitionKpis,
  getActivationKpis,
  getRetentionKpis,
  listCampaigns,
  listExperiments,
  listContentItems,
  listSeoPages,
  listKeywordClusters,
  listLifecycleFlows,
  listPlanItems,
} from '../services/marketingService';
import type { BusinessProfile, KpiMetric } from '../types';

export interface OrgContextResult {
  /** Pre-formatted block to append to the system prompt. */
  text: string;
  /** Raw fetched data, useful for the UI side panel. */
  data: {
    profile?: BusinessProfile;
    northStarKpis?: KpiMetric[];
    acquisitionKpis?: KpiMetric[];
    activationKpis?: KpiMetric[];
    retentionKpis?: KpiMetric[];
  };
  errors: string[];
}

async function safe<T>(label: string, fn: () => Promise<T>, errors: string[]): Promise<T | undefined> {
  try {
    return await fn();
  } catch (err) {
    errors.push(`${label}: ${(err as Error)?.message ?? 'failed'}`);
    return undefined;
  }
}

function formatKpis(label: string, kpis: KpiMetric[] | undefined): string {
  if (!kpis || kpis.length === 0) return '';
  const lines = kpis
    .slice(0, 6)
    .map((k) => `  - ${k.label}: ${k.value} (target ${k.target}, ${k.status}, ${k.trend})`)
    .join('\n');
  return `\n${label}:\n${lines}`;
}

function formatProfile(p: BusinessProfile | undefined): string {
  if (!p) return '';
  const lines: string[] = [];
  lines.push(`  - Primary growth focus: ${p.primaryGrowthFocus}`);
  lines.push(`  - Biggest bottleneck: ${p.biggestBottleneck}`);
  if (p.monthlyBudget) lines.push(`  - Monthly marketing budget: ₹${p.monthlyBudget.toLocaleString('en-IN')}`);
  if (p.targetCities?.length) lines.push(`  - Target cities: ${p.targetCities.join(', ')}`);
  if (p.topPatientPersona) lines.push(`  - Top patient persona: ${p.topPatientPersona}`);
  if (p.topReasonPatientChooses)
    lines.push(`  - #1 reason patients choose curex24: ${p.topReasonPatientChooses}`);
  if (p.topReasonProviderJoins)
    lines.push(`  - #1 reason providers join: ${p.topReasonProviderJoins}`);
  if (p.competitors?.length) lines.push(`  - Top competitors: ${p.competitors.join(', ')}`);
  if (p.bestPerforming) lines.push(`  - Best-performing channel/tactic so far: ${p.bestPerforming}`);
  return lines.length ? `\nBusiness profile:\n${lines.join('\n')}` : '';
}

export async function loadOrgContext(tools: SkillTool[] = []): Promise<OrgContextResult> {
  const errors: string[] = [];
  const wants = (t: SkillTool) => tools.length === 0 || tools.includes(t);

  const [
    profile,
    ns,
    acq,
    act,
    ret,
    campaigns,
    experiments,
    contentItems,
    seoPages,
    keywordClusters,
    lifecycleFlows,
    planItems,
  ] = await Promise.all([
    wants('profile') ? safe('profile', getBusinessProfile, errors) : Promise.resolve(undefined),
    wants('kpis.northStar') ? safe('northStarKpis', getNorthStarKpis, errors) : Promise.resolve(undefined),
    wants('kpis.acquisition') ? safe('acquisitionKpis', getAcquisitionKpis, errors) : Promise.resolve(undefined),
    wants('kpis.activation') ? safe('activationKpis', getActivationKpis, errors) : Promise.resolve(undefined),
    wants('kpis.retention') ? safe('retentionKpis', getRetentionKpis, errors) : Promise.resolve(undefined),
    wants('campaigns') ? safe('campaigns', listCampaigns, errors) : Promise.resolve(undefined),
    wants('experiments') ? safe('experiments', listExperiments, errors) : Promise.resolve(undefined),
    wants('contentCalendar') ? safe('contentCalendar', listContentItems, errors) : Promise.resolve(undefined),
    wants('seoPages') ? safe('seoPages', listSeoPages, errors) : Promise.resolve(undefined),
    wants('keywordClusters') ? safe('keywordClusters', listKeywordClusters, errors) : Promise.resolve(undefined),
    wants('lifecycleFlows') ? safe('lifecycleFlows', listLifecycleFlows, errors) : Promise.resolve(undefined),
    wants('planItems') ? safe('planItems', listPlanItems, errors) : Promise.resolve(undefined),
  ]);

  const sections: string[] = [];
  sections.push(formatProfile(profile));
  sections.push(formatKpis('North-star KPIs (last 30d)', ns));
  sections.push(formatKpis('Acquisition KPIs', acq));
  sections.push(formatKpis('Activation KPIs', act));
  sections.push(formatKpis('Retention KPIs', ret));

  if (campaigns?.length) {
    sections.push(
      `\nActive campaigns (${campaigns.length}): ${campaigns
        .filter((c) => c.status === 'active')
        .slice(0, 5)
        .map((c) => `${c.name} [${c.channel}, ${c.objective}]`)
        .join('; ') || 'none'}`,
    );
  }
  if (experiments?.length) {
    const running = experiments.filter((e) => e.status === 'running');
    if (running.length)
      sections.push(
        `\nRunning experiments (${running.length}): ${running
          .slice(0, 5)
          .map((e) => `${e.name} → ${e.metric}`)
          .join('; ')}`,
      );
  }
  if (contentItems?.length) {
    const planned = contentItems.filter((c) => c.status === 'planned' || c.status === 'in-progress');
    if (planned.length)
      sections.push(`\nUpcoming content items: ${planned.length} (next 30 days)`);
  }
  if (seoPages?.length) {
    const live = seoPages.filter((p) => p.status === 'live').length;
    sections.push(`\nSEO pages: ${seoPages.length} total, ${live} live`);
  }
  if (keywordClusters?.length) {
    sections.push(
      `\nKeyword clusters tracked: ${keywordClusters
        .slice(0, 5)
        .map((k) => `${k.cluster} (${k.priority})`)
        .join('; ')}`,
    );
  }
  if (lifecycleFlows?.length) {
    const active = lifecycleFlows.filter((f) => f.status === 'active').length;
    sections.push(`\nLifecycle flows: ${lifecycleFlows.length} total, ${active} active`);
  }
  if (planItems?.length) {
    const open = planItems.filter((p) => !p.done).length;
    sections.push(`\n90-day plan items: ${planItems.length} total, ${open} open`);
  }

  const text = sections.filter(Boolean).join('').trim();
  return {
    text: text
      ? `Live curex24 org context (use this to ground every recommendation in real numbers):\n${text}`
      : '',
    data: {
      profile,
      northStarKpis: ns,
      acquisitionKpis: acq,
      activationKpis: act,
      retentionKpis: ret,
    },
    errors,
  };
}

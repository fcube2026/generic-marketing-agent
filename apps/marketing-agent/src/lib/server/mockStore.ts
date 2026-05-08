/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * In-memory mock store for the self-contained marketing-agent backend.
 *
 * Powers `/api/backend/*` route handlers when no external API is configured
 * (i.e. `NEXT_PUBLIC_API_URL` is unset). Data is seeded with generic
 * placeholder content so the dashboard, campaigns, experiments, etc.
 * render meaningful UI out of the box. Mutations persist for the lifetime
 * of the dev server process and reset on restart.
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
} from '../types';

type IntakeResponses = Record<string, string | string[] | boolean | number>;

interface Store {
  profile: BusinessProfile;
  campaigns: Campaign[];
  experiments: Experiment[];
  contentItems: ContentItem[];
  seoPages: SeoPage[];
  keywordClusters: KeywordCluster[];
  lifecycleFlows: LifecycleFlow[];
  planItems: PlanItem[];
  intakeResponses: IntakeResponses;
  kpis: {
    'north-star': KpiMetric[];
    acquisition: KpiMetric[];
    activation: KpiMetric[];
    retention: KpiMetric[];
  };
}

const seed: Store = {
  profile: {
    primaryGrowthFocus: 'both',
    biggestBottleneck: 'subscription-conversion',
    monthlyBudget: 500000,
    allocatedBudget: 320000,
    targetCities: ['Mumbai', 'Bengaluru', 'Delhi'],
    bestPerforming: 'Word-of-mouth referrals and a focused Google Search campaign on high-intent personal-finance keywords.',
    topMemberPersona: 'Urban professional, 28–38, salaried, time-poor, high digital fluency, first-time investor.',
    topReasonMemberJoins: 'A clear, jargon-free way to budget, save and invest as a household.',
    topReasonMemberSubscribes: 'Family-shared dashboards, goal-based investing, and transparent, fixed pricing.',
    competitors: ['Competitor A', 'Competitor B'],
    founderLedBrand: true,
  },
  campaigns: [
    {
      id: 'c1',
      name: 'Brand Awareness — Q1',
      objective: 'Drive top-of-funnel awareness in priority cities',
      channel: 'Meta Ads',
      audience: 'Urban professionals, 25–40, interest-based — personal finance & investing',
      budget: '₹1,50,000',
      duration: '4 weeks',
      kpi: 'Reach + landing page CTR',
      status: 'active',
      headline: ['Take control of your money', 'Plan your family\u2019s financial future'],
      description: ['Track every rupee, set goals, and start investing — all in one app.'],
    },
    {
      id: 'c2',
      name: 'Search — High-Intent Conversions',
      objective: 'Capture bottom-of-funnel demand from in-market savers and investors',
      channel: 'Google Search',
      audience: 'In-market searchers — "best budgeting app", "SIP calculator", "family finance tracker"',
      budget: '₹1,00,000',
      duration: '6 weeks',
      kpi: 'Subscriptions / CAC',
      status: 'active',
      headline: ['Sign up in 2 minutes', 'Bank-grade security, transparent pricing'],
      description: ['Trusted by thousands. Connect accounts safely. No hidden fees.'],
    },
    {
      id: 'c3',
      name: 'Subscriber Activation — LinkedIn',
      objective: 'Convert free members into paid subscribers among working professionals',
      channel: 'LinkedIn',
      audience: 'Working professionals in target cities, 28–45, salaried',
      budget: '₹50,000',
      duration: '3 weeks',
      kpi: 'Free → Paid subscription conversion rate',
      status: 'planned',
      headline: [],
      description: [],
    },
  ],
  experiments: [
    {
      id: 'e1',
      name: 'Homepage hero — value prop A vs B',
      hypothesis: 'A specific outcome-led headline ("save ₹50k this year") will outperform a generic benefit headline.',
      channel: 'Web — Homepage',
      control: 'Generic benefit headline',
      variant: 'Specific outcome-led headline',
      metric: 'Hero CTA click-through rate',
      startDate: '2026-04-15',
      endDate: '2026-05-13',
      status: 'running',
    },
    {
      id: 'e2',
      name: 'Day-3 onboarding email — discount vs urgency',
      hypothesis: 'A scarcity-led subject line will lift open & click rates for the trial-to-paid nudge.',
      channel: 'Lifecycle Email',
      control: 'Discount-led subject line',
      variant: 'Urgency-led subject line',
      metric: 'Email click-through → first paid subscription',
      startDate: '2026-04-22',
      endDate: '2026-05-20',
      status: 'running',
    },
    {
      id: 'e3',
      name: 'Pricing page — 2 tiers vs 3 tiers',
      hypothesis: 'Three-tier pricing increases ARPU without hurting conversion.',
      channel: 'Web — Pricing',
      control: '2-tier pricing',
      variant: '3-tier pricing',
      metric: 'Conversion rate × ARPU',
      startDate: '2026-03-01',
      endDate: '2026-04-01',
      result: 'Variant lifted ARPU by 12% with no statistically significant drop in conversion.',
      winner: 'variant',
      status: 'completed',
      lift: '+12% ARPU',
    },
  ],
  contentItems: [
    { id: 'ci1', week: 1, day: 'Mon', platform: 'LinkedIn', pillar: 'product-education', title: 'How our family finance dashboard works in 4 steps', format: 'Carousel', status: 'ready' },
    { id: 'ci2', week: 1, day: 'Wed', platform: 'Instagram', pillar: 'social-proof', title: 'Member story — Priya, Mumbai (saved ₹80k in 6 months)', format: 'Reel', status: 'in-progress' },
    { id: 'ci3', week: 1, day: 'Fri', platform: 'Twitter/X', pillar: 'budgeting', title: '5 budgeting myths that keep you broke', format: 'Thread', status: 'planned' },
    { id: 'ci4', week: 2, day: 'Tue', platform: 'LinkedIn', pillar: 'saving-investing', title: 'SIP vs lump sum — what 5 years of data tells us', format: 'Single image', status: 'planned' },
    { id: 'ci5', week: 2, day: 'Thu', platform: 'Instagram', pillar: 'family-finance', title: 'Bengaluru launch teaser — family finance circles', format: 'Story', status: 'planned' },
  ],
  seoPages: [
    { id: 'sp1', url: '/budgeting/india', type: 'landing', title: 'Best budgeting app in India', status: 'live', targetKeyword: 'best budgeting app india' },
    { id: 'sp2', url: '/calculators/sip', type: 'calculator', title: 'SIP calculator — monthly investment planner', status: 'in-progress', targetKeyword: 'sip calculator' },
    { id: 'sp3', url: '/blog/getting-started', type: 'blog', title: 'Getting started — a step-by-step guide to family finance', status: 'live', targetKeyword: 'family finance getting started' },
    { id: 'sp4', url: '/compare/competitor-a', type: 'comparison', title: 'How we compare to Competitor A', status: 'planned', targetKeyword: 'competitor a alternative' },
  ],
  keywordClusters: [
    {
      id: 'kc1',
      cluster: 'Brand + product',
      type: 'transactional',
      priority: 'high',
      keywords: [
        { keyword: 'family budgeting app india', volume: '4.4K', difficulty: 'Medium' },
        { keyword: 'best money manager app', volume: '2.1K', difficulty: 'Medium' },
      ],
    },
    {
      id: 'kc2',
      cluster: 'How-to / educational',
      type: 'informational',
      priority: 'medium',
      keywords: [
        { keyword: 'how to start investing in india', volume: '1.6K', difficulty: 'Low' },
        { keyword: 'how to budget monthly salary', volume: '900', difficulty: 'Low' },
      ],
    },
  ],
  lifecycleFlows: [
    {
      id: 'lf1',
      name: 'Member onboarding — first 14 days',
      segment: 'member',
      trigger: 'New signup',
      status: 'active',
      steps: [
        { day: 0, channel: 'Email', message: 'Welcome + 2-min product tour', goal: 'Activation' },
        { day: 3, channel: 'Email', message: 'Reminder + first-budget incentive', goal: 'First budget set up' },
        { day: 7, channel: 'WhatsApp', message: 'Personal check-in + goal-setting nudge', goal: 'First savings goal' },
        { day: 14, channel: 'Email', message: 'Tips, social proof, referral CTA', goal: 'Retention' },
      ],
    },
    {
      id: 'lf2',
      name: 'Subscriber upgrade — first 30 days',
      segment: 'subscriber',
      trigger: 'Free trial started',
      status: 'active',
      steps: [
        { day: 0, channel: 'Email', message: 'Welcome + premium feature tour', goal: 'Feature activation' },
        { day: 3, channel: 'Email', message: 'How to invite your family circle', goal: 'Family circle activation' },
        { day: 14, channel: 'Email', message: 'Performance digest + upgrade nudge', goal: 'Free → Paid conversion' },
      ],
    },
  ],
  planItems: [
    { id: 'p1',  phase: '1-30',  category: 'Brand', task: 'Finalise positioning + value props', owner: 'Marketing Lead', done: true },
    { id: 'p2',  phase: '1-30',  category: 'Web', task: 'Launch new homepage hero', owner: 'Web', done: true },
    { id: 'p3',  phase: '1-30',  category: 'Paid', task: 'Stand up Google Search baseline campaign', owner: 'Performance', done: true },
    { id: 'p4',  phase: '1-30',  category: 'Lifecycle', task: 'Ship 14-day member onboarding flow', owner: 'Lifecycle', done: false },
    { id: 'p5',  phase: '31-60', category: 'SEO', task: 'Publish 5 calculator + guide landing pages', owner: 'Content', done: false },
    { id: 'p6',  phase: '31-60', category: 'Paid', task: 'Launch Meta brand-awareness campaign', owner: 'Performance', done: false },
    { id: 'p7',  phase: '31-60', category: 'Experiments', task: 'Run pricing 2 vs 3 tier experiment', owner: 'Growth', done: true },
    { id: 'p8',  phase: '31-60', category: 'Content', task: 'Publish 8 blog posts on the top informational cluster', owner: 'Content', done: false },
    { id: 'p9',  phase: '61-90', category: 'Growth', task: 'Launch family-circle referral program', owner: 'Growth', done: false },
    { id: 'p10', phase: '61-90', category: 'CRM', task: 'Ship win-back flow for 60-day inactive members', owner: 'Lifecycle', done: false },
    { id: 'p11', phase: '61-90', category: 'Reporting', task: 'Set up weekly KPI digest for leadership', owner: 'Analytics', done: false },
  ],
  intakeResponses: {},
  kpis: {
    'north-star': [
      { label: 'Monthly active members', value: '4,820', target: '6,000', trend: '+8.2% MoM', status: 'on-track', icon: '👥' },
      { label: 'Weekly transactions tracked', value: '1,240', target: '1,500', trend: '+5.1% WoW', status: 'on-track', icon: '📈' },
      { label: 'Active paid subscribers',     value: '148',   target: '200',   trend: '+3.4% MoM', status: 'at-risk', icon: '💳' },
    ],
    acquisition: [
      { label: 'New signups',     value: '1,820', target: '2,200', trend: '+11% MoM',   status: 'on-track', icon: '✨' },
      { label: 'CAC',             value: '₹612',  target: '₹550',  trend: '-3% MoM',    status: 'at-risk',  icon: '💰' },
      { label: 'Paid CTR',        value: '3.4%',  target: '3.0%',  trend: '+0.4 pts',   status: 'on-track', icon: '🎯' },
      { label: 'Organic visits',  value: '38.5K', target: '45K',   trend: '+9% MoM',    status: 'on-track', icon: '🌱' },
      { label: 'Referral share',  value: '9%',    target: '15%',   trend: '+1 pt MoM',  status: 'behind',   icon: '🔗' },
    ],
    activation: [
      { label: 'Signup → first budget (7d)', value: '28%', target: '35%', trend: '+2 pts MoM', status: 'at-risk',  icon: '⚡' },
      { label: 'Onboarding completion',      value: '64%', target: '75%', trend: '+4 pts MoM', status: 'at-risk',  icon: '🧭' },
      { label: 'Time to first value',        value: '2.4d', target: '1.5d', trend: '-0.3d MoM', status: 'on-track', icon: '⏱️' },
    ],
    retention: [
      { label: 'D7 retention',  value: '45%', target: '50%', trend: '+1 pt MoM', status: 'at-risk',  icon: '🔁' },
      { label: 'D30 retention', value: '22%', target: '28%', trend: '+1 pt MoM', status: 'at-risk',  icon: '🔁' },
      { label: 'D90 retention', value: '13%', target: '18%', trend: 'flat',      status: 'behind',   icon: '🔁' },
      { label: 'NPS',           value: '47',  target: '55',  trend: '+3 MoM',    status: 'on-track', icon: '⭐' },
    ],
  },
};

/**
 * Empty starting state used when `MARKETING_DATA_SOURCE` is not `mock`.
 * Production deployments should never see the placeholder seed above —
 * those numbers must come from the real backend (Prisma / fcube DB).
 */
const emptyStore: Store = {
  profile: {
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
  },
  campaigns: [],
  experiments: [],
  contentItems: [],
  seoPages: [],
  keywordClusters: [],
  lifecycleFlows: [],
  planItems: [],
  intakeResponses: {},
  kpis: {
    'north-star': [],
    acquisition: [],
    activation: [],
    retention: [],
  },
};

// Use a globalThis-cached store so it survives Next.js dev hot reloads.
type GlobalWithStore = typeof globalThis & { __marketingAgentStore?: Store };
const g = globalThis as GlobalWithStore;
if (!g.__marketingAgentStore) {
  // The mock store only ships seed data when the agent is *explicitly*
  // running in mock mode. With a real database (or no env preference)
  // the dashboard should render only what's in the fcube DB — never
  // fabricated placeholder content. This keeps `MARKETING_DATA_SOURCE=mock`
  // working end-to-end for offline dev while making sure a real
  // deployment never accidentally surfaces seed numbers.
  const pref = (process.env.MARKETING_DATA_SOURCE ?? process.env.DATA_SOURCE ?? '')
    .trim()
    .toLowerCase();
  const useSeed = pref === 'mock' || pref === 'memory';
  if (useSeed) {
    // Deep-clone the seed so mutations don't bleed across reloads.
    g.__marketingAgentStore = JSON.parse(JSON.stringify(seed));
  } else {
    g.__marketingAgentStore = JSON.parse(JSON.stringify(emptyStore));
  }
}
export const store: Store = g.__marketingAgentStore!;

let idCounter = Date.now();
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter.toString(36)}`;
}

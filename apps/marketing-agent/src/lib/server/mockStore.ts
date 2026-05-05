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
    biggestBottleneck: 'demand',
    monthlyBudget: 500000,
    allocatedBudget: 320000,
    targetCities: ['Mumbai', 'Bengaluru', 'Delhi'],
    bestPerforming: 'Word-of-mouth referrals and a focused Google Search campaign on high-intent keywords.',
    topCustomerPersona: 'Urban professional, 28–38, time-poor, high digital fluency.',
    topReasonCustomerChooses: 'Speed of signup and transparent pricing.',
    topReasonPartnerJoins: 'Steady customer flow with no upfront cost.',
    competitors: ['Competitor A', 'Competitor B'],
    founderLedBrand: true,
  },
  campaigns: [
    {
      id: 'c1',
      name: 'Brand Awareness — Q1',
      objective: 'Drive top-of-funnel awareness in priority cities',
      channel: 'Meta Ads',
      audience: 'Urban professionals, 25–40, interest-based',
      budget: '₹1,50,000',
      duration: '4 weeks',
      kpi: 'Reach + landing page CTR',
      status: 'active',
      headline: ['Save hours every week', 'A faster way, today'],
      description: ['Get what you need in minutes — book online and skip the queue.'],
    },
    {
      id: 'c2',
      name: 'Search — High-Intent Conversions',
      objective: 'Capture bottom-of-funnel demand',
      channel: 'Google Search',
      audience: 'In-market searchers',
      budget: '₹1,00,000',
      duration: '6 weeks',
      kpi: 'Conversions / CAC',
      status: 'active',
      headline: ['Get started in 2 minutes', 'Verified partners near you'],
      description: ['Trusted by thousands. Transparent pricing. No hidden fees.'],
    },
    {
      id: 'c3',
      name: 'Partner Recruitment — LinkedIn',
      objective: 'Grow supply of partners on the platform',
      channel: 'LinkedIn',
      audience: 'Independent professionals in target cities',
      budget: '₹50,000',
      duration: '3 weeks',
      kpi: 'Qualified partner applications',
      status: 'planned',
      headline: [],
      description: [],
    },
  ],
  experiments: [
    {
      id: 'e1',
      name: 'Homepage hero — value prop A vs B',
      hypothesis: 'A specific time-saving headline will outperform a generic benefit headline.',
      channel: 'Web — Homepage',
      control: 'Generic benefit headline',
      variant: 'Specific time-saving headline',
      metric: 'Hero CTA click-through rate',
      startDate: '2026-04-15',
      endDate: '2026-05-13',
      status: 'running',
    },
    {
      id: 'e2',
      name: 'Day-3 onboarding email — discount vs urgency',
      hypothesis: 'A scarcity-led subject line will lift open & click rates.',
      channel: 'Lifecycle Email',
      control: 'Discount-led subject line',
      variant: 'Urgency-led subject line',
      metric: 'Email click-through → first transaction',
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
    { id: 'ci1', week: 1, day: 'Mon', platform: 'LinkedIn', pillar: 'product-education', title: 'How our platform works in 4 steps', format: 'Carousel', status: 'ready' },
    { id: 'ci2', week: 1, day: 'Wed', platform: 'Instagram', pillar: 'social-proof', title: 'Customer story — Priya, Mumbai', format: 'Reel', status: 'in-progress' },
    { id: 'ci3', week: 1, day: 'Fri', platform: 'Twitter/X', pillar: 'audience-education', title: '5 myths about getting started online', format: 'Thread', status: 'planned' },
    { id: 'ci4', week: 2, day: 'Tue', platform: 'LinkedIn', pillar: 'partner-spotlight', title: 'Meet our top-rated partner of the month', format: 'Single image', status: 'planned' },
    { id: 'ci5', week: 2, day: 'Thu', platform: 'Instagram', pillar: 'local-community', title: 'Bengaluru launch teaser', format: 'Story', status: 'planned' },
  ],
  seoPages: [
    { id: 'sp1', url: '/services/mumbai', type: 'city-service', title: 'Services in Mumbai', status: 'live', targetKeyword: 'services mumbai' },
    { id: 'sp2', url: '/services/bengaluru', type: 'city-service', title: 'Services in Bengaluru', status: 'in-progress', targetKeyword: 'services bengaluru' },
    { id: 'sp3', url: '/blog/getting-started', type: 'blog', title: 'Getting started — a step-by-step guide', status: 'live', targetKeyword: 'getting started guide' },
    { id: 'sp4', url: '/compare/competitor-a', type: 'comparison', title: 'How we compare to Competitor A', status: 'planned', targetKeyword: 'competitor a alternative' },
  ],
  keywordClusters: [
    {
      id: 'kc1',
      cluster: 'Brand + city',
      type: 'transactional',
      priority: 'high',
      keywords: [
        { keyword: 'service in mumbai', volume: '4.4K', difficulty: 'Medium' },
        { keyword: 'best partner mumbai', volume: '2.1K', difficulty: 'Medium' },
      ],
    },
    {
      id: 'kc2',
      cluster: 'How-to / educational',
      type: 'informational',
      priority: 'medium',
      keywords: [
        { keyword: 'how to choose a partner', volume: '1.6K', difficulty: 'Low' },
        { keyword: 'what to expect on first visit', volume: '900', difficulty: 'Low' },
      ],
    },
  ],
  lifecycleFlows: [
    {
      id: 'lf1',
      name: 'Customer onboarding — first 14 days',
      segment: 'customer',
      trigger: 'New signup',
      status: 'active',
      steps: [
        { day: 0, channel: 'Email', message: 'Welcome + 2-min product tour', goal: 'Activation' },
        { day: 3, channel: 'Email', message: 'Reminder + first-use incentive', goal: 'First transaction' },
        { day: 7, channel: 'WhatsApp', message: 'Personal check-in + offer', goal: 'First transaction' },
        { day: 14, channel: 'Email', message: 'Tips, social proof, referral CTA', goal: 'Retention' },
      ],
    },
    {
      id: 'lf2',
      name: 'Partner onboarding — first 30 days',
      segment: 'partner',
      trigger: 'Partner approved',
      status: 'active',
      steps: [
        { day: 0, channel: 'Email', message: 'Welcome + verification checklist', goal: 'Profile completion' },
        { day: 3, channel: 'Email', message: 'How to receive your first request', goal: 'First request' },
        { day: 14, channel: 'Email', message: 'Performance digest + tips', goal: 'Retention' },
      ],
    },
  ],
  planItems: [
    { id: 'p1',  phase: '1-30',  category: 'Brand', task: 'Finalise positioning + value props', owner: 'Marketing Lead', done: true },
    { id: 'p2',  phase: '1-30',  category: 'Web', task: 'Launch new homepage hero', owner: 'Web', done: true },
    { id: 'p3',  phase: '1-30',  category: 'Paid', task: 'Stand up Google Search baseline campaign', owner: 'Performance', done: true },
    { id: 'p4',  phase: '1-30',  category: 'Lifecycle', task: 'Ship 14-day customer onboarding flow', owner: 'Lifecycle', done: false },
    { id: 'p5',  phase: '31-60', category: 'SEO', task: 'Publish 5 city-targeted landing pages', owner: 'Content', done: false },
    { id: 'p6',  phase: '31-60', category: 'Paid', task: 'Launch Meta brand-awareness campaign', owner: 'Performance', done: false },
    { id: 'p7',  phase: '31-60', category: 'Experiments', task: 'Run pricing 2 vs 3 tier experiment', owner: 'Growth', done: true },
    { id: 'p8',  phase: '31-60', category: 'Content', task: 'Publish 8 blog posts on the top informational cluster', owner: 'Content', done: false },
    { id: 'p9',  phase: '61-90', category: 'Growth', task: 'Launch 2-sided referral program', owner: 'Growth', done: false },
    { id: 'p10', phase: '61-90', category: 'CRM', task: 'Ship win-back flow for 60-day inactives', owner: 'Lifecycle', done: false },
    { id: 'p11', phase: '61-90', category: 'Reporting', task: 'Set up weekly KPI digest for leadership', owner: 'Analytics', done: false },
  ],
  intakeResponses: {},
  kpis: {
    'north-star': [
      { label: 'Monthly active customers', value: '4,820', target: '6,000', trend: '+8.2% MoM', status: 'on-track', icon: '👥' },
      { label: 'Weekly transactions',     value: '1,240', target: '1,500', trend: '+5.1% WoW', status: 'on-track', icon: '🛒' },
      { label: 'Active partners',         value: '148',   target: '200',   trend: '+3.4% MoM', status: 'at-risk',   icon: '🤝' },
    ],
    acquisition: [
      { label: 'New signups',     value: '1,820', target: '2,200', trend: '+11% MoM',   status: 'on-track', icon: '✨' },
      { label: 'CAC',             value: '₹612',  target: '₹550',  trend: '-3% MoM',    status: 'at-risk',  icon: '💰' },
      { label: 'Paid CTR',        value: '3.4%',  target: '3.0%',  trend: '+0.4 pts',   status: 'on-track', icon: '🎯' },
      { label: 'Organic visits',  value: '38.5K', target: '45K',   trend: '+9% MoM',    status: 'on-track', icon: '🌱' },
      { label: 'Referral share',  value: '9%',    target: '15%',   trend: '+1 pt MoM',  status: 'behind',   icon: '🔗' },
    ],
    activation: [
      { label: 'Signup → first action (7d)', value: '28%', target: '35%', trend: '+2 pts MoM', status: 'at-risk',  icon: '⚡' },
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

// Use a globalThis-cached store so it survives Next.js dev hot reloads.
type GlobalWithStore = typeof globalThis & { __marketingAgentStore?: Store };
const g = globalThis as GlobalWithStore;
if (!g.__marketingAgentStore) {
  // Deep-clone the seed so mutations don't bleed across reloads.
  g.__marketingAgentStore = JSON.parse(JSON.stringify(seed));
}
export const store: Store = g.__marketingAgentStore!;

let idCounter = Date.now();
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter.toString(36)}`;
}

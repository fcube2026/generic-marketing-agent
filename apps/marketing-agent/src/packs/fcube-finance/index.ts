/**
 * `fcube-finance` domain pack — finance / fintech vertical for the FCube
 * ecosystem. Re-skins the marketing-agent for personal finance, family
 * finance, expense-sharing circles, and subscription-based financial
 * products.
 *
 * Brand: FCube — "Your Life, Cubed" (Family · Finance · Future).
 *
 * Strictly additive: registering this pack does not change the default
 * tenant. To activate, set `DOMAIN_PACK=fcube-finance` (and optionally
 * `AGENT_TENANT_NAME=FCube`, `AGENT_CURRENCY=INR`, etc.) in the runtime
 * environment. fcube-finance is the zero-config default; this comment is
 * preserved to document the override mechanism for additional packs.
 *
 * This is Phase 0 of the FCube finance roadmap: brand + taxonomy + KPI
 * scaffolding + intake + skill metadata. Subsequent phases add a
 * read-only `FinanceDataSource`, finance dashboards, CRM models, the
 * landing-page generator, etc. — see `docs/fcube-finance-pack.md`.
 */

import type { DomainPack } from '@/core';
import { registerDomainPack } from '@/core';

export const fcubeFinancePack: DomainPack = {
  id: 'fcube-finance',
  version: '0.1.0',
  name: 'FCube finance',
  description:
    'Growth, retention, and CRM for FCube — personal finance, family finance, expense-sharing circles, and subscription-based financial products. "Your Life, Cubed."',
  terminology: {
    customer: 'member',
    provider: 'circle',
    campaign: 'campaign',
    funnel: 'subscription funnel',
    lifecycle: 'lifecycle journey',
  },

  resources: [
    {
      id: 'profile',
      label: 'Business profile',
      labelSingular: 'Business profile',
      icon: '🧊',
      singleton: true,
      fields: [
        {
          name: 'primaryGrowthFocus',
          type: 'enum',
          enum: ['acquisition', 'activation', 'subscription-conversion', 'retention', 'referral'],
          required: true,
        },
        {
          name: 'biggestBottleneck',
          type: 'enum',
          enum: ['signup-drop', 'first-circle-setup', 'subscription-upgrade', 'churn', 'engagement'],
          required: true,
        },
        { name: 'monthlyBudget', type: 'number', required: true },
        { name: 'allocatedBudget', type: 'number', required: true },
        { name: 'targetCountries', type: 'string[]' },
        { name: 'targetOccupations', type: 'string[]' },
        { name: 'topMemberPersona', type: 'string' },
        { name: 'topReasonMemberJoins', type: 'string' },
        { name: 'topReasonMemberSubscribes', type: 'string' },
        { name: 'competitors', type: 'string[]' },
        { name: 'pricingModel', type: 'enum', enum: ['freemium', 'subscription-only', 'tiered', 'family-plan'] },
        { name: 'founderLedBrand', type: 'boolean' },
      ],
    },
    {
      id: 'intake-responses',
      label: 'Intake responses',
      labelSingular: 'Intake responses',
      singleton: true,
      fields: [{ name: 'data', type: 'object' }],
    },
    {
      id: 'campaigns',
      label: 'Campaigns',
      labelSingular: 'Campaign',
      icon: '📣',
      fields: [
        { name: 'name', type: 'string', required: true },
        {
          name: 'objective',
          type: 'enum',
          enum: ['signup', 'activation', 'subscription', 'referral', 'reactivation', 'upsell'],
        },
        {
          name: 'channel',
          type: 'enum',
          enum: ['email', 'whatsapp', 'push', 'in-app', 'paid-social', 'organic-social', 'seo', 'partnership'],
        },
        { name: 'audience', type: 'string' },
        { name: 'budget', type: 'string' },
        { name: 'duration', type: 'string' },
        { name: 'kpi', type: 'string' },
        { name: 'status', type: 'enum', enum: ['active', 'planned', 'completed', 'paused'] },
        { name: 'headline', type: 'string[]' },
        { name: 'description', type: 'string[]' },
      ],
    },
    {
      id: 'experiments',
      label: 'Experiments',
      labelSingular: 'Experiment',
      icon: '🧪',
      fields: [
        { name: 'name', type: 'string', required: true },
        { name: 'hypothesis', type: 'string' },
        { name: 'channel', type: 'string' },
        { name: 'control', type: 'string' },
        { name: 'variant', type: 'string' },
        { name: 'metric', type: 'string' },
        { name: 'startDate', type: 'date' },
        { name: 'endDate', type: 'date' },
        { name: 'result', type: 'string' },
        { name: 'winner', type: 'enum', enum: ['control', 'variant', 'no-difference'] },
        { name: 'status', type: 'enum', enum: ['running', 'completed', 'planned', 'paused'] },
        { name: 'lift', type: 'string' },
      ],
    },
    {
      id: 'content-items',
      label: 'Content calendar',
      labelSingular: 'Content item',
      icon: '🗓️',
      fields: [
        { name: 'week', type: 'number' },
        { name: 'day', type: 'string' },
        {
          name: 'platform',
          type: 'enum',
          enum: ['blog', 'instagram', 'linkedin', 'twitter', 'youtube', 'whatsapp', 'email', 'push'],
        },
        {
          name: 'pillar',
          type: 'enum',
          enum: ['budgeting', 'saving', 'investing', 'family-finance', 'subscriptions', 'debt', 'tax', 'wealth'],
        },
        { name: 'title', type: 'string', required: true },
        { name: 'format', type: 'string' },
        { name: 'status', type: 'enum', enum: ['planned', 'in-progress', 'ready', 'published'] },
      ],
    },
    {
      id: 'seo-pages',
      label: 'SEO pages',
      labelSingular: 'SEO page',
      icon: '🔎',
      fields: [
        { name: 'url', type: 'string', required: true },
        {
          name: 'type',
          type: 'enum',
          enum: ['landing', 'comparison', 'calculator', 'guide', 'blog', 'glossary'],
        },
        { name: 'title', type: 'string' },
        { name: 'status', type: 'enum', enum: ['live', 'in-progress', 'planned'] },
        { name: 'targetKeyword', type: 'string' },
      ],
    },
    {
      id: 'keyword-clusters',
      label: 'Keyword clusters',
      labelSingular: 'Keyword cluster',
      icon: '🧭',
      fields: [
        { name: 'cluster', type: 'string', required: true },
        {
          name: 'type',
          type: 'enum',
          enum: ['transactional', 'informational', 'comparison', 'calculator', 'long-tail'],
        },
        { name: 'priority', type: 'enum', enum: ['high', 'medium', 'low'] },
        { name: 'keywords', type: 'object' },
      ],
    },
    {
      id: 'lifecycle-flows',
      label: 'Lifecycle flows',
      labelSingular: 'Lifecycle flow',
      icon: '🔁',
      fields: [
        { name: 'name', type: 'string', required: true },
        {
          name: 'segment',
          type: 'enum',
          enum: ['new-member', 'free-active', 'trial', 'subscriber', 'churn-risk', 'reactivation'],
        },
        { name: 'trigger', type: 'string' },
        { name: 'status', type: 'enum', enum: ['active', 'draft', 'paused'] },
        { name: 'steps', type: 'object' },
      ],
    },
    {
      id: 'plan-items',
      label: 'Plan items',
      labelSingular: 'Plan item',
      icon: '✅',
      fields: [
        { name: 'phase', type: 'enum', enum: ['1-30', '31-60', '61-90'] },
        { name: 'category', type: 'string' },
        { name: 'task', type: 'string', required: true },
        { name: 'owner', type: 'string' },
        { name: 'done', type: 'boolean' },
      ],
    },

    // ── Read-only projections from FCube finance data ─────────────────
    // Surfaced by the Phase 1 `FinanceDataSource` (not yet implemented).
    // Defined here so the UI scaffolding and pack validators are ready
    // when the adapter lands. Writes are rejected with
    // `ReadOnlyDataSourceError`.
    {
      id: 'members',
      label: 'Members',
      labelSingular: 'Member',
      icon: '👤',
      readOnly: true,
      fields: [
        { name: 'phone', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'occupation', type: 'string' },
        { name: 'country', type: 'string' },
        { name: 'plan', type: 'enum', enum: ['free', 'trial', 'pro', 'family'] },
        { name: 'isActive', type: 'boolean' },
        { name: 'engagementScore', type: 'number' },
        { name: 'createdAt', type: 'date' },
      ],
    },
    {
      id: 'circles',
      label: 'Finance circles',
      labelSingular: 'Finance circle',
      icon: '⭕',
      readOnly: true,
      fields: [
        { name: 'name', type: 'string', required: true },
        { name: 'memberCount', type: 'number' },
        { name: 'monthlySpend', type: 'number' },
        { name: 'topCategory', type: 'string' },
        { name: 'createdAt', type: 'date' },
      ],
    },
    {
      id: 'subscriptions',
      label: 'Subscriptions',
      labelSingular: 'Subscription',
      icon: '💳',
      readOnly: true,
      fields: [
        { name: 'memberId', type: 'string' },
        { name: 'plan', type: 'enum', enum: ['trial', 'pro', 'family'] },
        { name: 'status', type: 'enum', enum: ['active', 'trialing', 'past_due', 'canceled'] },
        { name: 'mrr', type: 'number' },
        { name: 'discountApplied', type: 'number' },
        { name: 'startedAt', type: 'date' },
        { name: 'renewsAt', type: 'date' },
        { name: 'canceledAt', type: 'date' },
      ],
    },
    {
      id: 'referrals',
      label: 'Referrals',
      labelSingular: 'Referral',
      icon: '🔗',
      readOnly: true,
      fields: [
        { name: 'inviterId', type: 'string' },
        { name: 'inviteeId', type: 'string' },
        { name: 'status', type: 'enum', enum: ['sent', 'accepted', 'subscribed'] },
        { name: 'rewardAmount', type: 'number' },
        { name: 'sentAt', type: 'date' },
        { name: 'convertedAt', type: 'date' },
      ],
    },
  ],

  // Finance KPIs grouped by acquisition / activation / monetisation /
  // retention / referral / behavior. Targets are illustrative INR
  // defaults — tenants override them per-deployment via the
  // BusinessProfile / KPI editor, and currency symbols should be
  // re-formatted to match `AGENT_CURRENCY`.
  kpis: [
    // North-star
    { id: 'mrr',                     label: 'MRR',                        category: 'north-star',   target: '₹25L',    icon: '📈' },
    { id: 'arr',                     label: 'ARR',                        category: 'north-star',   target: '₹3Cr',    icon: '🚀' },
    { id: 'active-members',          label: 'Monthly active members',     category: 'north-star',   target: '50,000',  icon: '👥' },
    { id: 'paying-members',          label: 'Paying members',             category: 'north-star',   target: '7,500',   icon: '💎' },

    // Acquisition
    { id: 'new-signups',             label: 'New signups',                category: 'acquisition',  target: '8,000',   icon: '✨' },
    { id: 'cac',                     label: 'CAC',                        category: 'acquisition',  target: '₹400',    icon: '💰' },
    { id: 'paid-ctr',                label: 'Paid CTR',                   category: 'acquisition',  target: '3.5%',    icon: '🎯' },
    { id: 'organic-visits',          label: 'Organic visits',             category: 'acquisition',  target: '120K',    icon: '🌱' },

    // Activation
    { id: 'first-circle-created',    label: 'First circle created (7d)',  category: 'activation',   target: '55%',     icon: '⚡' },
    { id: 'first-expense-logged',    label: 'First expense logged (3d)',  category: 'activation',   target: '70%',     icon: '🧭' },
    { id: 'time-to-first-value',     label: 'Time to first value',        category: 'activation',   target: '24h',     icon: '⏱️' },

    // Monetisation
    { id: 'subscription-conversion', label: 'Free → paid conversion',     category: 'monetisation', target: '8%',      icon: '💳' },
    { id: 'arpu',                    label: 'ARPU',                       category: 'monetisation', target: '₹350',    icon: '🪙' },
    { id: 'ltv',                     label: 'LTV',                        category: 'monetisation', target: '₹4,200',  icon: '🏆' },
    { id: 'discount-redemption-rate', label: 'Discount redemption rate', category: 'monetisation', target: '< 12%',   icon: '🏷️', formula: 'orders_with_discount / total_orders' },
    { id: 'revenue-generated',       label: 'Revenue (30d)',              category: 'monetisation', target: '₹30L',    icon: '💵' },

    // Retention & churn
    { id: 'd7-retention',            label: 'D7 retention',               category: 'retention',    target: '55%',     icon: '🔁' },
    { id: 'd30-retention',           label: 'D30 retention',              category: 'retention',    target: '32%',     icon: '🔁' },
    { id: 'd90-retention',           label: 'D90 retention',              category: 'retention',    target: '20%',     icon: '🔁' },
    { id: 'monthly-churn',           label: 'Monthly churn',              category: 'retention',    target: '< 4%',    icon: '🚪' },
    { id: 'nps',                     label: 'NPS',                        category: 'retention',    target: '55',      icon: '⭐' },

    // Referral
    { id: 'referral-invites-sent',   label: 'Referral invites sent',      category: 'referral',     target: '15K',     icon: '📨' },
    { id: 'referral-conversion',     label: 'Referral conversion rate',   category: 'referral',     target: '22%',     icon: '🔗' },
    { id: 'referral-share',          label: 'Referral share of signups',  category: 'referral',     target: '20%',     icon: '🤝' },

    // Behavior / finance habits
    { id: 'avg-monthly-spend',       label: 'Avg monthly spend / member', category: 'behavior',     target: '₹38K',    icon: '📊' },
    { id: 'circle-spending-trend',   label: 'Circle spending trend',      category: 'behavior',     target: '+8% MoM', icon: '🧊' },
    { id: 'income-vs-expense-ratio', label: 'Income vs expense ratio',    category: 'behavior',     target: '1.4x',    icon: '⚖️' },
    { id: 'engagement-score',        label: 'Engagement score',           category: 'behavior',     target: '> 60',    icon: '🔥' },
  ],

  // Finance-education skill catalog. Skill *prompts* will be authored
  // in `src/lib/skills/registry.ts` (or migrated here) in a follow-up
  // phase — see roadmap. The metadata below is enough for the
  // `pack/skills` UI to surface the catalog and for the recommendation
  // engine to map user behavior → suggested skills.
  skills: [],

  intakeQuestions: [
    {
      id: 'primaryGrowthFocus',
      label: 'What is your primary growth focus right now?',
      type: 'select',
      options: ['acquisition', 'activation', 'subscription-conversion', 'retention', 'referral'],
      required: true,
    },
    {
      id: 'biggestBottleneck',
      label: 'What is the single biggest bottleneck in the funnel today?',
      type: 'select',
      options: ['signup-drop', 'first-circle-setup', 'subscription-upgrade', 'churn', 'engagement'],
      required: true,
    },
    {
      id: 'monthlyBudget',
      label: 'Approximate marketing budget per month (in your local currency)',
      type: 'number',
      required: true,
    },
    {
      id: 'targetCountries',
      label: 'Top 3 target countries / regions',
      type: 'multiselect',
    },
    {
      id: 'targetOccupations',
      label: 'Which member occupations / segments do you target most?',
      type: 'multiselect',
      helperText: 'e.g. salaried professionals, students, freelancers, families, small-business owners',
    },
    {
      id: 'pricingModel',
      label: 'Which pricing model best describes FCube today?',
      type: 'select',
      options: ['freemium', 'subscription-only', 'tiered', 'family-plan'],
    },
    {
      id: 'topMemberPersona',
      label: 'Describe your top member persona in 1-2 lines',
      type: 'textarea',
    },
    {
      id: 'topReasonMemberSubscribes',
      label: 'What is the single biggest reason members upgrade to a paid plan?',
      type: 'textarea',
    },
  ],

  // No mock seed data: finance reads should come from the FCube backend
  // via the (Phase 1) `FinanceDataSource`. Memory-mode dev workspaces
  // start empty and let users author their own campaigns / experiments
  // / SEO pages from a clean slate.
};

// Auto-register so a single `import '@/packs/fcube-finance'` is enough.
registerDomainPack(fcubeFinancePack);

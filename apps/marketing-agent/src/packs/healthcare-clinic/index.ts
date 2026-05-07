/**
 * `healthcare-clinic` domain pack — the default vertical the marketing-agent
 * ships with. Refactors the previously-hard-coded seed data + intake form +
 * skill metadata into a `DomainPack`, so swapping in a different vertical
 * (e.g. e-commerce, SaaS, education, real-estate) is a drop-in pack swap
 * with no core changes.
 *
 * Resource shapes mirror the legacy `src/lib/types.ts` so the existing UI
 * and the legacy `MockDataSource` keep working in parallel during the
 * migration.
 */

import type { DomainPack } from '@/core';
import { registerDomainPack } from '@/core';
import { store } from '@/lib/server/mockStore';

export const healthcareClinicPack: DomainPack = {
  id: 'healthcare-clinic',
  version: '1.0.0',
  name: 'Healthcare clinic',
  description:
    'Patient + provider growth for two-sided healthcare marketplaces and clinic networks.',
  terminology: {
    customer: 'patient',
    provider: 'provider',
    campaign: 'campaign',
    funnel: 'funnel',
    lifecycle: 'lifecycle flow',
  },

  resources: [
    {
      id: 'profile',
      label: 'Business profile',
      labelSingular: 'Business profile',
      icon: '🏥',
      singleton: true,
      fields: [
        { name: 'primaryGrowthFocus', type: 'enum', enum: ['patients', 'providers', 'both'], required: true },
        { name: 'biggestBottleneck', type: 'enum', enum: ['supply', 'demand', 'activation'], required: true },
        { name: 'monthlyBudget', type: 'number', required: true },
        { name: 'allocatedBudget', type: 'number', required: true },
        { name: 'targetCities', type: 'string[]' },
        { name: 'bestPerforming', type: 'string' },
        { name: 'topPatientPersona', type: 'string' },
        { name: 'topReasonPatientChooses', type: 'string' },
        { name: 'topReasonProviderJoins', type: 'string' },
        { name: 'competitors', type: 'string[]' },
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
        { name: 'objective', type: 'string' },
        { name: 'channel', type: 'string' },
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
        { name: 'platform', type: 'string' },
        { name: 'pillar', type: 'string' },
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
        { name: 'type', type: 'enum', enum: ['city-specialty', 'condition', 'blog', 'comparison'] },
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
        { name: 'type', type: 'enum', enum: ['transactional', 'informational', 'comparison', 'provider-side'] },
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
        { name: 'segment', type: 'enum', enum: ['patient', 'provider'] },
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

    // ── Read-only projections from the fcube clinical database ─────────
    // These resources are surfaced by the FcubeDataSource. Writes are
    // rejected with `ReadOnlyDataSourceError` — clinical data is never
    // mutated from the marketing dashboard.
    {
      id: 'users',
      label: 'Users',
      labelSingular: 'User',
      icon: '👤',
      readOnly: true,
      fields: [
        { name: 'phone', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'role', type: 'string' },
        { name: 'isActive', type: 'boolean' },
        { name: 'createdAt', type: 'date' },
      ],
    },
    {
      id: 'patients',
      label: 'Patients',
      labelSingular: 'Patient',
      icon: '🧑‍⚕️',
      readOnly: true,
      fields: [
        { name: 'name', type: 'string', required: true },
        { name: 'phone', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'verificationStatus', type: 'string' },
        { name: 'trustScore', type: 'number' },
        { name: 'totalBookings', type: 'number' },
        { name: 'flaggedBookings', type: 'number' },
        { name: 'isFlagged', type: 'boolean' },
        { name: 'createdAt', type: 'date' },
      ],
    },
    {
      id: 'providers',
      label: 'Providers',
      labelSingular: 'Provider',
      icon: '🩺',
      readOnly: true,
      fields: [
        { name: 'name', type: 'string', required: true },
        { name: 'specialization', type: 'string' },
        { name: 'phone', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'isVerified', type: 'boolean' },
        { name: 'isActive', type: 'boolean' },
        { name: 'isAvailable', type: 'boolean' },
        { name: 'homeVisitEnabled', type: 'boolean' },
        { name: 'videoConsultationEnabled', type: 'boolean' },
        { name: 'consultationFeeHomeVisit', type: 'number' },
        { name: 'consultationFeeVideoConsultation', type: 'number' },
        { name: 'createdAt', type: 'date' },
      ],
    },
    {
      id: 'bookings',
      label: 'Bookings',
      labelSingular: 'Booking',
      icon: '📅',
      readOnly: true,
      fields: [
        { name: 'patientId', type: 'string' },
        { name: 'providerId', type: 'string' },
        { name: 'serviceCategoryId', type: 'string' },
        { name: 'mode', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'paymentStatus', type: 'string' },
        { name: 'totalFee', type: 'number' },
        { name: 'scheduledAt', type: 'date' },
        { name: 'createdAt', type: 'date' },
      ],
    },
    {
      id: 'pharmacy-orders',
      label: 'Pharmacy orders',
      labelSingular: 'Pharmacy order',
      icon: '💊',
      readOnly: true,
      fields: [
        { name: 'orderNumber', type: 'string' },
        { name: 'patientProfileId', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'paymentStatus', type: 'string' },
        { name: 'totalAmount', type: 'number' },
        { name: 'deliveredAt', type: 'date' },
        { name: 'createdAt', type: 'date' },
      ],
    },
  ],

  kpis: [
    { id: 'monthly-active-customers', label: 'Monthly active customers', category: 'north-star', target: '6,000', icon: '👥' },
    { id: 'weekly-transactions',      label: 'Weekly transactions',      category: 'north-star', target: '1,500', icon: '🛒' },
    { id: 'active-providers',         label: 'Active partners',          category: 'north-star', target: '200',   icon: '🤝' },
    { id: 'new-signups',              label: 'New signups',              category: 'acquisition', target: '2,200', icon: '✨' },
    { id: 'cac',                      label: 'CAC',                      category: 'acquisition', target: '₹550',  icon: '💰' },
    { id: 'paid-ctr',                 label: 'Paid CTR',                 category: 'acquisition', target: '3.0%',  icon: '🎯' },
    { id: 'organic-visits',           label: 'Organic visits',           category: 'acquisition', target: '45K',   icon: '🌱' },
    { id: 'referral-share',           label: 'Referral share',           category: 'acquisition', target: '15%',   icon: '🔗' },
    { id: 'signup-to-first-action',   label: 'Signup → first action (7d)', category: 'activation', target: '35%',  icon: '⚡' },
    { id: 'onboarding-completion',    label: 'Onboarding completion',    category: 'activation', target: '75%',   icon: '🧭' },
    { id: 'time-to-first-value',      label: 'Time to first value',      category: 'activation', target: '1.5d',  icon: '⏱️' },
    { id: 'd7-retention',             label: 'D7 retention',             category: 'retention',  target: '50%',   icon: '🔁' },
    { id: 'd30-retention',            label: 'D30 retention',            category: 'retention',  target: '28%',   icon: '🔁' },
    { id: 'd90-retention',            label: 'D90 retention',            category: 'retention',  target: '18%',   icon: '🔁' },
    { id: 'nps',                      label: 'NPS',                      category: 'retention',  target: '55',    icon: '⭐' },
  ],

  // Skills are still authored in `src/lib/skills/registry.ts` for backwards
  // compatibility. As they migrate, list them here as `SkillDef`s. The
  // `pack/skills` route already knows how to surface them once added.
  skills: [],

  intakeQuestions: [
    {
      id: 'primaryGrowthFocus',
      label: 'What is your primary growth focus right now?',
      type: 'select',
      options: ['patients', 'providers', 'both'],
      required: true,
    },
    {
      id: 'biggestBottleneck',
      label: 'What is the single biggest bottleneck in the funnel today?',
      type: 'select',
      options: ['supply', 'demand', 'activation'],
      required: true,
    },
    {
      id: 'monthlyBudget',
      label: 'Approximate marketing budget per month (in your local currency)',
      type: 'number',
      required: true,
    },
    {
      id: 'targetCities',
      label: 'Top 3 target cities / regions',
      type: 'multiselect',
    },
    {
      id: 'topPatientPersona',
      label: 'Describe your top customer persona in 1-2 lines',
      type: 'textarea',
    },
  ],

  // Seed data is sourced lazily from the legacy `mockStore` so a single
  // shared in-memory state powers both the legacy `MockDataSource` and the
  // new generic `MemoryDataSource` until the legacy adapter is retired.
  seedData: {
    campaigns: store.campaigns,
    experiments: store.experiments,
    'content-items': store.contentItems,
    'seo-pages': store.seoPages,
    'keyword-clusters': store.keywordClusters,
    'lifecycle-flows': store.lifecycleFlows,
    'plan-items': store.planItems,
  },
  seedSingletons: {
    profile: store.profile,
    'intake-responses': store.intakeResponses,
  },
};

// Auto-register so a single `import '@/packs/healthcare-clinic'` is enough.
registerDomainPack(healthcareClinicPack);

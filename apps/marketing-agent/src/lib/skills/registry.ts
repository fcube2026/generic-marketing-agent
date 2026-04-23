/**
 * Registry of advanced skill configurations. The 5 highest-leverage skills
 * (Ad Creative, Copywriting, SEO Audit, Email Sequence, Page CRO) get
 * full bespoke configs — typed inputs, declared outputs, evaluation rubrics,
 * matching visuals.
 *
 * Every other skill in `marketingSkills` falls back to a sensible auto-generated
 * baseline so the runner UI works for all 20 — no skill is left as a static
 * card-only experience.
 */

import type {
  AdvancedSkillConfig,
  SkillRubricCriterion,
} from './types';
import { marketingSkills, type MarketingSkill } from '../data';

// ─── Shared rubrics ──────────────────────────────────────────────────────────

const COMMON_CRITERIA: SkillRubricCriterion[] = [
  {
    id: 'specificity',
    description: 'Output is specific to curex24 (cities, ICP, tone) — not generic ChatGPT advice.',
    weight: 5,
  },
  {
    id: 'actionability',
    description: 'Each recommendation is concrete, prioritised, and has a clear next step.',
    weight: 4,
  },
  {
    id: 'brand_voice',
    description: 'Tone matches curex24 — clear, warm, professional, India-localised, ₹ pricing.',
    weight: 3,
  },
  {
    id: 'compliance',
    description:
      'No medical claims, no fabricated testimonials, respects NMC/DPDP norms, no unverifiable promises.',
    weight: 5,
  },
  {
    id: 'evidence',
    description: 'Uses the live KPI / profile context provided rather than guessing numbers.',
    weight: 4,
  },
];

const HEALTHCARE_GUARDRAILS = [
  'Never make medical claims, prescribe treatment, or diagnose conditions.',
  'Never invent doctor names, patient names, ratings, or testimonials.',
  'Quote prices in ₹ INR and use Indian formats (lakhs, crores) when natural.',
  'Comply with NMC advertising rules (no superlative cure claims) and DPDP Act (no PII in copy).',
  'When uncertain, flag the assumption and suggest how to validate.',
];

// ─── Per-skill bespoke configs ──────────────────────────────────────────────

const BESPOKE: Record<string, AdvancedSkillConfig> = {
  // ── 1. Ad Creative ─────────────────────────────────────────────────────────
  'ad-creative': {
    systemPrompt: `You are a senior performance-creative strategist for curex24 (at-home doctor visits, India). You produce ad-creative matrices that maximise CTR and lower CPA. You think in **hook × angle × format** combinations and explain WHY each variant should win for a specific audience.`,
    promptTemplate: `Produce a **{{variantCount}}-variant ad creative matrix** for curex24 on **{{platform}}** targeting **{{audience}}** in **{{cities}}**.

Campaign objective: **{{objective}}**
Primary offer / CTA: **{{offer}}**
{{#if competitorAds}}Competitor ads we're displacing: {{competitorAds}}{{/if}}
{{#if extraNotes}}Extra notes: {{extraNotes}}{{/if}}

For each variant produce:
1. **Hook** (first line that stops the scroll)
2. **Angle** (problem-solution / social-proof / urgency / education / fear-of-missing-out / authority)
3. **Headline** (≤40 chars) and **Primary text** (≤125 chars)
4. **Description** (≤30 chars) — Google/Meta as relevant
5. **CTA button** label
6. **Visual direction** — 1-sentence brief for the image-generator
7. **Predicted CTR uplift vs control** (low / med / high) with one-sentence reasoning

After the matrix:
- Add a **"Recommended top-3 to launch first"** section ranked by expected CPA impact.
- Add a **CSV-ready table** in JSON form (headline, primary_text, description, cta, visual_brief) inside a fenced \`\`\`json block — that becomes the bulk-upload export.`,
    inputs: [
      {
        name: 'platform',
        label: 'Platform',
        type: 'select',
        required: true,
        options: ['Meta (Facebook + Instagram)', 'Google Ads', 'YouTube', 'LinkedIn', 'X / Twitter'],
        defaultValue: 'Meta (Facebook + Instagram)',
      },
      {
        name: 'objective',
        label: 'Objective',
        type: 'select',
        required: true,
        options: [
          'Patient acquisition (first booking)',
          'App installs',
          'Care-plan subscription',
          'Provider recruitment',
          'Brand awareness',
          'Retargeting / re-engagement',
        ],
        defaultValue: 'Patient acquisition (first booking)',
      },
      {
        name: 'audience',
        label: 'Target audience',
        type: 'textarea',
        required: true,
        placeholder: 'e.g. Urban working women 28-45 with elderly parents at home',
      },
      {
        name: 'cities',
        label: 'Cities',
        type: 'multiselect',
        options: ['Mumbai', 'Delhi NCR', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune'],
        defaultValue: ['Mumbai', 'Delhi NCR', 'Bengaluru'],
      },
      {
        name: 'offer',
        label: 'Primary offer / CTA',
        type: 'text',
        required: true,
        placeholder: 'e.g. ₹100 off first home visit — book in 60 seconds',
      },
      {
        name: 'variantCount',
        label: 'Number of variants',
        type: 'number',
        defaultValue: 10,
      },
      {
        name: 'competitorAds',
        label: 'Competitor ads to displace (optional)',
        type: 'textarea',
        placeholder: 'Paste headlines/screenshots descriptions',
      },
      {
        name: 'extraNotes',
        label: 'Extra notes (optional)',
        type: 'textarea',
      },
    ],
    outputs: [
      { key: 'matrix', label: 'Creative matrix', kind: 'markdown' },
      { key: 'topThree', label: 'Top 3 to launch', kind: 'copy' },
      { key: 'csvJson', label: 'Bulk-upload JSON', kind: 'json', downloadExtension: 'json' },
      { key: 'visual', label: 'Sample visual', kind: 'image' },
    ],
    tools: ['profile', 'kpis.acquisition', 'campaigns'],
    guardrails: HEALTHCARE_GUARDRAILS,
    successCriteria: [
      ...COMMON_CRITERIA,
      {
        id: 'variant_diversity',
        description: 'Variants span genuinely different hooks/angles, not paraphrases.',
        weight: 4,
      },
      {
        id: 'platform_native',
        description: 'Copy respects the chosen platform’s character limits and conventions.',
        weight: 4,
      },
    ],
    model: 'gpt-4o-mini',
    visual: { width: 1080, height: 1080, promptHint: 'social ad creative, clean, brand-safe' },
    tier: 'free',
  },

  // ── 2. Copywriting ─────────────────────────────────────────────────────────
  copywriting: {
    systemPrompt: `You are a senior brand copywriter for curex24. You rewrite marketing copy using a chosen framework (PAS, AIDA, StoryBrand, JTBD, BAB) while staying inside the curex24 brand voice. You always produce **3 variants** so the user can A/B them, plus a side-by-side comparison vs the original.`,
    promptTemplate: `Rewrite this copy using the **{{framework}}** framework, in curex24's brand voice ({{tone}}).

Page / surface: **{{surface}}**
Primary audience: **{{audience}}**
Goal of the copy: **{{goal}}**

Original copy:
"""
{{originalCopy}}
"""

{{#if mustInclude}}Must-include phrases or proof points: {{mustInclude}}{{/if}}
{{#if avoidWords}}Avoid: {{avoidWords}}{{/if}}

Deliver:
1. **Variant A — safe** (closest to current voice)
2. **Variant B — bold** (more emotional / story-driven)
3. **Variant C — data-led** (uses concrete numbers / proof)

For each variant include: headline, sub-headline, body, CTA. Then add:
- A **Flesch-ease score estimate** for each variant
- A **side-by-side diff table** (Original vs Recommended pick) with a 1-line rationale per change`,
    inputs: [
      {
        name: 'surface',
        label: 'Page / surface',
        type: 'text',
        required: true,
        placeholder: 'e.g. Homepage hero, Pricing page, Onboarding screen 2',
      },
      {
        name: 'originalCopy',
        label: 'Original copy',
        type: 'textarea',
        required: true,
        maxLength: 3000,
        placeholder: 'Paste the existing headline, sub-headline, body, CTA…',
      },
      {
        name: 'framework',
        label: 'Copywriting framework',
        type: 'select',
        required: true,
        options: ['PAS (Problem-Agitate-Solution)', 'AIDA', 'StoryBrand', 'Jobs-to-be-Done', 'Before-After-Bridge'],
        defaultValue: 'PAS (Problem-Agitate-Solution)',
      },
      {
        name: 'tone',
        label: 'Tone',
        type: 'select',
        options: ['Warm + reassuring', 'Confident + clinical', 'Friendly + casual', 'Premium + minimal'],
        defaultValue: 'Warm + reassuring',
      },
      {
        name: 'audience',
        label: 'Audience',
        type: 'textarea',
        required: true,
      },
      {
        name: 'goal',
        label: 'Goal of the copy',
        type: 'text',
        required: true,
        placeholder: 'e.g. Get the visitor to tap "Book a home visit"',
      },
      { name: 'mustInclude', label: 'Must-include phrases / proof', type: 'textarea' },
      { name: 'avoidWords', label: 'Words / claims to avoid', type: 'textarea' },
    ],
    outputs: [
      { key: 'variants', label: '3 copy variants', kind: 'copy' },
      { key: 'diff', label: 'Side-by-side vs original', kind: 'markdown' },
    ],
    tools: ['profile'],
    guardrails: HEALTHCARE_GUARDRAILS,
    successCriteria: [
      ...COMMON_CRITERIA,
      {
        id: 'framework_fidelity',
        description: 'Each variant clearly follows the structure of the chosen framework.',
        weight: 4,
      },
    ],
    model: 'gpt-4o-mini',
    tier: 'free',
  },

  // ── 3. SEO Audit ───────────────────────────────────────────────────────────
  'seo-audit': {
    systemPrompt: `You are a technical + content SEO auditor for healthcare brands in India. You produce **prioritised, ICE-scored** audit findings (Impact × Confidence × Ease) for curex24, distinguishing technical / on-page / content / off-page issues. Every finding becomes a **one-click plan item**.`,
    promptTemplate: `Run a full SEO audit for the curex24 page **{{pageUrl}}** targeting the keyword **"{{targetKeyword}}"** in **{{geo}}**.

{{#if competitors}}Top competitors currently ranking for this query: {{competitors}}{{/if}}
{{#if knownIssues}}Known issues already on our radar: {{knownIssues}}{{/if}}

Deliver:
1. **Executive summary** — 3 sentences: where we stand, biggest opportunity, biggest risk.
2. **Findings table** in a fenced \`\`\`json block. Schema:
   \`\`\`
   [{
     "id": "F-01",
     "category": "technical|on-page|content|off-page|local-seo|schema",
     "title": "...",
     "description": "...",
     "ice": { "impact": 1-10, "confidence": 1-10, "ease": 1-10, "score": <product/10> },
     "recommendation": "...",
     "estimatedLift": "..."
   }, ...]
   \`\`\`
   Aim for **10-15 findings**, sorted by ICE score descending.
3. **Quick wins** — top 5 ranked by ICE.
4. **Content gap analysis** vs the competitors above (entities / FAQs / formats they have and we don't).
5. **Local + healthcare-specific recommendations** (NAP, Physician schema, DigiLocker / NMC mentions where relevant).
6. **Suggested measurement** — exact GA4 / Search Console queries to validate each top fix.`,
    inputs: [
      { name: 'pageUrl', label: 'Page URL to audit', type: 'url', required: true, placeholder: 'https://curex24.com/...' },
      { name: 'targetKeyword', label: 'Target keyword', type: 'text', required: true },
      {
        name: 'geo',
        label: 'Primary geo',
        type: 'select',
        options: ['India (national)', 'Mumbai', 'Delhi NCR', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune'],
        defaultValue: 'India (national)',
      },
      { name: 'competitors', label: 'Competitor URLs (optional)', type: 'textarea' },
      { name: 'knownIssues', label: 'Known issues (optional)', type: 'textarea' },
    ],
    outputs: [
      { key: 'summary', label: 'Executive summary', kind: 'markdown' },
      { key: 'findings', label: 'ICE-scored findings', kind: 'json', downloadExtension: 'json' },
      { key: 'quickWins', label: 'Quick wins', kind: 'table' },
      { key: 'contentGaps', label: 'Content gap analysis', kind: 'markdown' },
    ],
    tools: ['seoPages', 'keywordClusters', 'profile'],
    guardrails: HEALTHCARE_GUARDRAILS,
    successCriteria: [
      ...COMMON_CRITERIA,
      {
        id: 'ice_rigor',
        description: 'ICE scores are individually justified and the top finding is plausibly the highest-ROI fix.',
        weight: 5,
      },
      {
        id: 'machine_readable',
        description: 'The findings JSON is valid and conforms to the documented schema.',
        weight: 5,
      },
    ],
    model: 'gpt-4o-mini',
    tier: 'free',
  },

  // ── 4. Email Sequence ─────────────────────────────────────────────────────
  'email-sequence': {
    systemPrompt: `You are a lifecycle email expert for curex24. You design sequences that ship as a real \`MarketingLifecycleFlow\` row — every step has a trigger, day offset, channel, subject, preheader, body, and a measurable goal. You write 2 subject-line variants per step for A/B testing, and propose send-time-optimised slots in IST.`,
    promptTemplate: `Design a **{{stepCount}}-step {{audience}}** lifecycle sequence for curex24.

Trigger event: **{{trigger}}**
Primary goal: **{{goal}}**
Success metric: **{{metric}}**
{{#if exclusions}}Exclude users who: {{exclusions}}{{/if}}

For each step output:
- **Day offset from trigger** + recommended **IST send window** (e.g. Tue 10:00–11:00 IST, with reasoning).
- **Channel** (email / WhatsApp / push / in-app — pick what suits the message).
- **Subject A** and **Subject B** (≤45 chars each), with which one is the safer baseline.
- **Preheader** (≤90 chars).
- **Body** in plain markdown — short, scannable, single CTA.
- **Goal of this step** + how it ladders to the sequence goal.
- **Stop condition** (what makes the user exit the flow).

After the steps, add:
1. **JSON spec** in a fenced \`\`\`json block matching the LifecycleFlow shape so it can be one-click imported. Schema: { name, segment, trigger, status, steps: [{ day, channel, message, goal }] }.
2. **Predicted funnel** — rough conversion estimate for each step using any baseline numbers in the org context.`,
    inputs: [
      {
        name: 'audience',
        label: 'Audience',
        type: 'select',
        required: true,
        options: ['patient', 'provider'],
        defaultValue: 'patient',
      },
      {
        name: 'trigger',
        label: 'Trigger event',
        type: 'select',
        required: true,
        options: [
          'New patient signup (no booking yet)',
          'First booking completed',
          'Cancelled before consultation',
          'Care-plan trial started',
          'Provider applied (KYC pending)',
          'Provider went inactive (>14 days)',
          'Failed payment',
          'Custom (describe in notes)',
        ],
        defaultValue: 'New patient signup (no booking yet)',
      },
      {
        name: 'goal',
        label: 'Primary goal',
        type: 'text',
        required: true,
        placeholder: 'e.g. First booking within 14 days',
      },
      {
        name: 'metric',
        label: 'Success metric',
        type: 'text',
        required: true,
        placeholder: 'e.g. Signup → Booking conversion rate',
      },
      { name: 'stepCount', label: 'Number of steps', type: 'number', defaultValue: 7 },
      { name: 'exclusions', label: 'Exclusion rules', type: 'textarea' },
    ],
    outputs: [
      { key: 'sequence', label: 'Step-by-step sequence', kind: 'markdown' },
      { key: 'lifecycleJson', label: 'LifecycleFlow JSON', kind: 'json', downloadExtension: 'json' },
      { key: 'funnel', label: 'Predicted funnel', kind: 'table' },
    ],
    tools: ['profile', 'lifecycleFlows', 'kpis.activation', 'kpis.retention'],
    guardrails: HEALTHCARE_GUARDRAILS,
    successCriteria: [
      ...COMMON_CRITERIA,
      {
        id: 'send_time_logic',
        description: 'Send-time recommendations consider IST work patterns and trigger context.',
        weight: 3,
      },
      {
        id: 'importable',
        description: 'The JSON block is valid and conforms to LifecycleFlow shape (one-click importable).',
        weight: 5,
      },
    ],
    model: 'gpt-4o-mini',
    tier: 'free',
  },

  // ── 5. Page CRO ────────────────────────────────────────────────────────────
  'page-cro': {
    systemPrompt: `You are a senior conversion-rate optimisation strategist for curex24 landing pages. You ingest a page (URL or pasted content) and produce an **ICE-scored experiment backlog** that is one-click importable into the experiments dashboard. You always cite the funnel KPI you expect each test to move and propose an MDE-aware sample size.`,
    promptTemplate: `Audit and propose CRO experiments for the curex24 page **{{pageUrl}}**.

Current monthly traffic: **{{monthlyTraffic}}** | Current conversion rate: **{{currentCvr}}%** → target: **{{targetCvr}}%**
Primary conversion event: **{{conversionEvent}}**
Top drop-off step (if known): **{{dropoffStep}}**
Audience visiting this page: **{{audience}}**
{{#if pageContent}}Pasted page content / screenshot description:
"""
{{pageContent}}
"""{{/if}}

Deliver:
1. **Diagnostic summary** — what's almost certainly hurting conversion (3-5 bullets).
2. **Experiment backlog** as a JSON table (10+ rows) in a fenced \`\`\`json block. Each row:
   \`\`\`
   {
     "id": "E-01",
     "hypothesis": "If we ___ then ___ because ___",
     "variantDescription": "...",
     "primaryMetric": "...",
     "guardrails": ["..."],
     "ice": { "impact": 1-10, "confidence": 1-10, "ease": 1-10, "score": <num> },
     "estimatedLift": "+X% absolute / relative",
     "minSampleSize": <num>,
     "runDuration": "X days"
   }
   \`\`\`
   Sort by ICE score desc.
3. **Top 3 to ship this sprint** with the actual variant copy / layout description.
4. **Measurement plan** — GA4 events to add, dashboards to build.`,
    inputs: [
      { name: 'pageUrl', label: 'Page URL', type: 'url', required: true },
      { name: 'audience', label: 'Audience visiting', type: 'textarea', required: true },
      { name: 'conversionEvent', label: 'Primary conversion event', type: 'text', required: true, placeholder: 'e.g. booking_completed' },
      { name: 'monthlyTraffic', label: 'Monthly traffic to this page', type: 'number', defaultValue: 10000 },
      { name: 'currentCvr', label: 'Current conversion rate (%)', type: 'number', defaultValue: 2.5 },
      { name: 'targetCvr', label: 'Target conversion rate (%)', type: 'number', defaultValue: 4 },
      { name: 'dropoffStep', label: 'Top drop-off step (optional)', type: 'text' },
      { name: 'pageContent', label: 'Paste page content (optional)', type: 'textarea', maxLength: 4000 },
    ],
    outputs: [
      { key: 'diagnostic', label: 'Diagnostic summary', kind: 'markdown' },
      { key: 'backlog', label: 'ICE-scored experiment backlog', kind: 'json', downloadExtension: 'json' },
      { key: 'sprint', label: 'Top 3 to ship', kind: 'copy' },
      { key: 'measurement', label: 'Measurement plan', kind: 'markdown' },
    ],
    tools: ['kpis.activation', 'profile', 'experiments'],
    guardrails: HEALTHCARE_GUARDRAILS,
    successCriteria: [
      ...COMMON_CRITERIA,
      {
        id: 'sample_size',
        description: 'Min sample sizes are within an order of magnitude of a standard MDE calculator for the given baseline.',
        weight: 3,
      },
      {
        id: 'one_click_importable',
        description: 'Backlog JSON is valid and matches the documented experiment schema.',
        weight: 5,
      },
    ],
    model: 'gpt-4o-mini',
    tier: 'free',
  },
};

// ─── Baseline factory for the remaining 15 skills ────────────────────────────

function baselineConfig(skill: MarketingSkill): AdvancedSkillConfig {
  return {
    systemPrompt: `You are a senior marketing operator running the **${skill.name}** skill for curex24 (at-home doctor visits, India). You produce structured, prioritised, brand-safe deliverables — not generic advice. Use the live org context provided to ground every recommendation in real numbers.`,
    promptTemplate: `Run the **${skill.name}** skill for curex24.

Objective: **{{objective}}**
{{#if context}}Context the user provided:
{{context}}{{/if}}
{{#if constraints}}Constraints / non-goals: {{constraints}}{{/if}}
Primary success metric: **{{successMetric}}**
Time horizon: **{{timeHorizon}}**

Deliver:
1. **Executive summary** (3 sentences): situation → recommendation → expected impact.
2. **Numbered, prioritised recommendations** (5-8). Each: what to do, why, owner, effort, expected lift, how to measure.
3. **30-day action plan** as a markdown table (Week | Owner | Action | Definition of done).
4. **Risks & guardrails**.
5. **JSON spec** of the action plan inside a fenced \`\`\`json block — schema:
   \`[{ "week": 1-4, "owner": "...", "action": "...", "successMetric": "...", "estimatedLift": "..." }, ...]\`
   so it can be one-click imported as MarketingPlanItem rows.`,
    inputs: [
      {
        name: 'objective',
        label: 'What do you want to achieve?',
        type: 'textarea',
        required: true,
        placeholder: skill.examplePrompt,
      },
      { name: 'context', label: 'Relevant context (optional)', type: 'textarea' },
      { name: 'constraints', label: 'Constraints / non-goals (optional)', type: 'text' },
      {
        name: 'successMetric',
        label: 'Primary success metric',
        type: 'text',
        required: true,
        placeholder: 'e.g. +20% bookings, -15% CAC, 15% referral rate',
      },
      {
        name: 'timeHorizon',
        label: 'Time horizon',
        type: 'select',
        options: ['1 week', '30 days', '60 days', '90 days', 'this quarter'],
        defaultValue: '30 days',
      },
    ],
    outputs: [
      { key: 'summary', label: 'Executive summary', kind: 'markdown' },
      { key: 'recommendations', label: 'Prioritised recommendations', kind: 'markdown' },
      { key: 'plan', label: '30-day action plan', kind: 'table' },
      { key: 'planJson', label: 'Plan JSON (importable)', kind: 'json', downloadExtension: 'json' },
    ],
    tools: ['profile', 'kpis.northStar'],
    guardrails: HEALTHCARE_GUARDRAILS,
    successCriteria: COMMON_CRITERIA,
    model: 'gpt-4o-mini',
    tier: 'free',
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

const REGISTRY: Record<string, AdvancedSkillConfig> = (() => {
  const out: Record<string, AdvancedSkillConfig> = { ...BESPOKE };
  for (const s of marketingSkills) {
    if (!out[s.id]) out[s.id] = baselineConfig(s);
  }
  return out;
})();

export function getAdvancedSkillConfig(skillId: string): AdvancedSkillConfig | undefined {
  return REGISTRY[skillId];
}

export function isBespokeSkill(skillId: string): boolean {
  return Object.prototype.hasOwnProperty.call(BESPOKE, skillId);
}

/** Stable list of all skill IDs that have an advanced config (i.e. all of them). */
export function listAdvancedSkillIds(): string[] {
  return Object.keys(REGISTRY);
}

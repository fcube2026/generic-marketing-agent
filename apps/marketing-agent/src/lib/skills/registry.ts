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
    description: 'Output is specific to your brand (cities, ICP, tone) — not generic ChatGPT advice.',
    weight: 5,
  },
  {
    id: 'actionability',
    description: 'Each recommendation is concrete, prioritised, and has a clear next step.',
    weight: 4,
  },
  {
    id: 'brand_voice',
    description: 'Tone matches your brand — clear, warm, professional, India-localised, ₹ pricing.',
    weight: 3,
  },
  {
    id: 'compliance',
    description:
      'No guaranteed-return claims, no fabricated testimonials; respects SEBI/RBI advertising norms and DPDP Act (no PII in copy).',
    weight: 5,
  },
  {
    id: 'evidence',
    description: 'Uses the live KPI / profile context provided rather than guessing numbers.',
    weight: 4,
  },
];

const FINANCE_GUARDRAILS = [
  'Never make guaranteed-return, risk-free or "best returns" claims; always include the standard "investments are subject to market risk" caveat where relevant.',
  'Never invent member names, advisor names, ratings, or testimonials.',
  'Quote prices in ₹ INR and use Indian formats (lakhs, crores) when natural.',
  'Comply with SEBI/RBI advertising rules (no superlative performance claims) and DPDP Act (no PII in copy).',
  'When uncertain, flag the assumption and suggest how to validate.',
];

// ─── Per-skill bespoke configs ──────────────────────────────────────────────

const BESPOKE: Record<string, AdvancedSkillConfig> = {
  // ── 1. Ad Creative ─────────────────────────────────────────────────────────
  'ad-creative': {
    systemPrompt: `You are a senior performance-creative strategist for a personal-finance brand (budgeting + saving + investing for individuals and families, India). You produce ad-creative matrices that maximise CTR and lower CPA. You think in **hook × angle × format** combinations and explain WHY each variant should win for a specific audience.`,
    promptTemplate: `Produce a **{{variantCount}}-variant ad creative matrix** on **{{platform}}** targeting **{{audience}}** in **{{cities}}**.

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
          'Member acquisition (free signup)',
          'App installs',
          'Paid subscription conversion',
          'Family-circle activation',
          'Brand awareness',
          'Retargeting / re-engagement',
        ],
        defaultValue: 'Member acquisition (free signup)',
      },
      {
        name: 'audience',
        label: 'Target audience',
        type: 'textarea',
        required: true,
        placeholder: 'e.g. Salaried urban professionals 28-45 starting their first SIP / managing household budgets',
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
        placeholder: 'e.g. ₹100 off first month — sign up in 60 seconds',
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
    guardrails: FINANCE_GUARDRAILS,
    successCriteria: [
      ...COMMON_CRITERIA,
      {
        id: 'variant_diversity',
        description: 'Variants span genuinely different hooks/angles, not paraphrases.',
        weight: 4,
      },
      {
        id: 'platform_native',
        description: 'Copy respects the chosen platform\u2019s character limits and conventions.',
        weight: 4,
      },
    ],
    model: 'gpt-4o-mini',
    visual: { width: 1080, height: 1080, promptHint: 'social ad creative, clean, brand-safe' },
    tier: 'free',
  },

  // ── 2. Copywriting ─────────────────────────────────────────────────────────
  copywriting: {
    systemPrompt: `You are a senior brand copywriter for a personal-finance brand. You rewrite marketing copy using a chosen framework (PAS, AIDA, StoryBrand, JTBD, BAB) while staying inside brand voice. You always produce **3 variants** so the user can A/B them, plus a side-by-side comparison vs the original.`,
    promptTemplate: `Rewrite this copy using the **{{framework}}** framework, in the brand's voice ({{tone}}).

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
        options: ['Warm + reassuring', 'Confident + expert', 'Friendly + casual', 'Premium + minimal'],
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
        placeholder: 'e.g. Get the visitor to tap "Start a free budget"',
      },
      { name: 'mustInclude', label: 'Must-include phrases / proof', type: 'textarea' },
      { name: 'avoidWords', label: 'Words / claims to avoid', type: 'textarea' },
    ],
    outputs: [
      { key: 'variants', label: '3 copy variants', kind: 'copy' },
      { key: 'diff', label: 'Side-by-side vs original', kind: 'markdown' },
    ],
    tools: ['profile'],
    guardrails: FINANCE_GUARDRAILS,
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
    systemPrompt: `You are a technical + content SEO auditor for personal-finance brands in India. You produce **prioritised, ICE-scored** audit findings (Impact × Confidence × Ease), distinguishing technical / on-page / content / off-page issues. Every finding becomes a **one-click plan item**.`,
    promptTemplate: `Run a full SEO audit for the page **{{pageUrl}}** targeting the keyword **"{{targetKeyword}}"** in **{{geo}}**.

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
5. **Local + finance-specific recommendations** (NAP, FinancialProduct / SoftwareApplication schema, SEBI/RBI disclosure mentions where relevant).
6. **Suggested measurement** — exact GA4 / Search Console queries to validate each top fix.`,
    inputs: [
      { name: 'pageUrl', label: 'Page URL to audit', type: 'url', required: true, placeholder: 'https://example.com/...' },
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
    guardrails: FINANCE_GUARDRAILS,
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
    systemPrompt: `You are a lifecycle email expert for a personal-finance brand. You design sequences that ship as a real \`MarketingLifecycleFlow\` row — every step has a trigger, day offset, channel, subject, preheader, body, and a measurable goal. You write 2 subject-line variants per step for A/B testing, and propose send-time-optimised slots in IST.`,
    promptTemplate: `Design a **{{stepCount}}-step {{audience}}** lifecycle sequence.

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
        options: ['member', 'subscriber'],
        defaultValue: 'member',
      },
      {
        name: 'trigger',
        label: 'Trigger event',
        type: 'select',
        required: true,
        options: [
          'New member signup (no budget set up yet)',
          'First budget set up',
          'Cancelled before first paid renewal',
          'Premium trial started',
          'Bank-account link pending',
          'Member went inactive (>14 days)',
          'Failed payment',
          'Custom (describe in notes)',
        ],
        defaultValue: 'New member signup (no budget set up yet)',
      },
      {
        name: 'goal',
        label: 'Primary goal',
        type: 'text',
        required: true,
        placeholder: 'e.g. First budget set up + first savings goal within 14 days',
      },
      {
        name: 'metric',
        label: 'Success metric',
        type: 'text',
        required: true,
        placeholder: 'e.g. Signup → First paid subscription conversion rate',
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
    guardrails: FINANCE_GUARDRAILS,
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
    systemPrompt: `You are a senior conversion-rate optimisation strategist for personal-finance landing pages. You ingest a page (URL or pasted content) and produce an **ICE-scored experiment backlog** that is one-click importable into the experiments dashboard. You always cite the funnel KPI you expect each test to move and propose an MDE-aware sample size.`,
    promptTemplate: `Audit and propose CRO experiments for the page **{{pageUrl}}**.

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
      { name: 'conversionEvent', label: 'Primary conversion event', type: 'text', required: true, placeholder: 'e.g. paid_subscription_started' },
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
    guardrails: FINANCE_GUARDRAILS,
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

  // ── 6. Landing Page Builder ───────────────────────────────────────────────
  'landing-page': {
    systemPrompt: `You are a world-class landing-page art director + conversion copywriter who has shipped award-winning, top-of-the-funnel pages for premium consumer-finance and lifestyle brands. You produce **production-ready, visually stunning, on-brand** landing pages that read like they were built by a senior in-house design team — NOT generic "Tailwind starter" output.

Non-negotiable design bar — every page you ship must demonstrate ALL of these:
- A custom Tailwind config block that defines a tasteful brand palette (primary / accent / neutral scale), a typographic scale, and one or two premium Google Fonts (e.g. 'Inter', 'Sora', 'Plus Jakarta Sans', 'DM Serif Display') loaded via <link> in <head>.
- A modern hero composition: confident H1 with strong type hierarchy (≥3 distinct sizes), refined kerning/leading, a soft animated gradient-mesh / radial-glow background, and a credible product-mock placeholder (use https://placehold.co/... at 2x retina dimensions — never plain coloured rectangles).
- Generous whitespace, 8-pt spacing rhythm, consistent rounded-2xl/3xl radii, subtle ring/border shadows, and accessible colour contrast (WCAG AA minimum).
- Micro-interactions implemented in pure CSS only: hover lifts, focus rings, scroll-snap where useful, prefers-reduced-motion fallbacks.
- Conversion fundamentals on every section: above-the-fold > proof > value > objection-handling > final CTA, with mobile-first ordering.
- Real semantic HTML5 + ARIA, alt text on every image, skip-to-content link, focus-visible styles, and a working mobile nav (details/summary or pure-CSS toggle — no JS frameworks).

You ground every claim in the live brand context provided. You never invent testimonials, names, ratings, prices, or stats — if the user did not give you a proof point, you OMIT that section rather than fabricate it.`,
    promptTemplate: `Build a **premium, production-ready landing page** for **{{pageGoal}}**.

Business / brand name: **{{businessName}}**
Industry / category: **{{industry}}**
Audience: **{{audience}}**
Primary CTA: **{{primaryCta}}**
Secondary CTA (optional): **{{secondaryCta}}**
Offer / value proposition: **{{offer}}**
Tone: **{{tone}}**
Design style: **{{designStyle}}**
Technical output: **{{outputFormat}}**
{{#if colorPalette}}Preferred palette / visual cues: **{{colorPalette}}**{{/if}}
{{#if referenceUrls}}Reference URLs / inspiration:
{{referenceUrls}}{{/if}}
{{#if formIntegration}}Form integration / handoff requirement: **{{formIntegration}}**{{/if}}
Sections to include (in order): **{{sections}}**
{{#if keyBenefits}}Key benefits / features to highlight:
{{keyBenefits}}{{/if}}
{{#if socialProof}}Social proof / testimonials / numbers we can cite:
{{socialProof}}{{/if}}
{{#if mustInclude}}Must-include phrases or compliance lines: {{mustInclude}}{{/if}}
{{#if avoidWords}}Avoid: {{avoidWords}}{{/if}}
{{#if sectionDrafts}}Use these approved section drafts as the source of truth where possible:
{{sectionDrafts}}{{/if}}

Deliver, in this exact order:

1. **Page outline** — a numbered list of the sections in final order, each with a 1-line purpose and the conversion job it does.

2. **Copy blocks** — for every section produce final copy:
   - Hero: eyebrow, H1 (≤60 chars), sub-headline (≤140 chars), primary CTA label, supporting micro-copy under the CTA, hero visual brief.
   - Each remaining section: section title, body copy in markdown, any list items, CTA if applicable.
   - For testimonials/social-proof: only use proof points the user explicitly provided — do NOT invent names, ratings, or quotes.

3. **Full HTML page** in a fenced \`\`\`html block. This is the headline deliverable — it must look and feel like a top 1% modern SaaS landing page on first paint. Hard requirements:
   - Single self-contained \`<!doctype html>\` document with \`<html lang>\`, viewport meta, theme-color, and a descriptive \`<title>\` + \`<meta name="description">\`.
   - Tailwind via the CDN script \`<script src="https://cdn.tailwindcss.com"></script>\` in \`<head>\`, **followed by** an inline \`<script>tailwind.config = { theme: { extend: { ... } } }</script>\` block defining a real brand palette, font family, container widths and any custom shadows used on the page.
   - One or two premium Google Fonts loaded via \`<link rel="preconnect">\` + \`<link href="https://fonts.googleapis.com/css2?...">\` and applied via the Tailwind config.
   - Hero: gradient-mesh / radial-glow background composed with Tailwind utilities or an inline \`<style>\` block, an animated subtle blob/aurora using CSS \`@keyframes\`, a confident H1, supportive sub-headline, primary + secondary CTA buttons (rounded-full, ring, hover-lift), trust line under the CTA, and a 2x retina hero mock from \`https://placehold.co/1200x800/...\` with descriptive alt text.
   - Mobile-first responsive layout with a working \`<details>\`-based mobile nav, sticky header with subtle blur (\`backdrop-blur\`), and a footer with brand mark, nav, legal links, and copyright.
    - Accessible: skip-to-content link, focus-visible rings, ARIA labels where needed, sufficient contrast, and a \`@media (prefers-reduced-motion: reduce)\` block that disables animations.
    - All copy from step 2 wired in. Use placeholder \`https://placehold.co/...\` URLs for any product mock-ups, avatars, and logos with descriptive alt text.
    - No external JS frameworks, no tracking pixels, no \`<form>\` action that posts to a third party. Both CTAs link to \`#cta\` anchors.
    - Respect technical requirements. If the requested output is React-oriented, keep the markup JSX-safe and append a short "React implementation notes" list after the HTML block. If a form integration is specified, show the hook-up points in copy / notes without posting directly to the third party.

4. **JSON-LD schema** in a fenced \`\`\`json block — appropriate \`@type\` (e.g. WebPage + Product/FinancialProduct + FAQPage if a FAQ section is present + Organization). Only include fields that are actually populated by the page; do not invent ratings or reviews.

5. **Recommended A/B tests** — top 5 prioritised experiments to run on this page after launch (hypothesis + variant + primary metric).

6. **Measurement plan** — exact GA4 events to fire on the page (event name, trigger, parameters) covering page_view, CTA clicks, scroll depth, and form submit if relevant.`,
    inputs: [
      {
        name: 'businessName',
        label: 'Business / brand name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Acme Health',
      },
      {
        name: 'industry',
        label: 'Industry / category',
        type: 'text',
        required: true,
        placeholder: 'e.g. Healthcare clinic, B2B SaaS, fitness coaching',
      },
      {
        name: 'pageGoal',
        label: 'Page goal',
        type: 'text',
        required: true,
        placeholder: 'e.g. Drive free signups for the family budgeting plan',
      },
      {
        name: 'audience',
        label: 'Target audience',
        type: 'textarea',
        required: true,
        placeholder: 'e.g. Dual-income parents in Mumbai/Bengaluru, 30-45, juggling EMIs + kids\u2019 school fees',
      },
      {
        name: 'offer',
        label: 'Offer / value proposition',
        type: 'textarea',
        required: true,
        placeholder: 'e.g. Free family budget in 60 seconds — link 2 accounts, see where the money goes',
      },
      {
        name: 'primaryCta',
        label: 'Primary CTA label',
        type: 'text',
        required: true,
        defaultValue: 'Start free',
      },
      {
        name: 'secondaryCta',
        label: 'Secondary CTA (optional)',
        type: 'text',
        placeholder: 'e.g. See how it works',
      },
      {
        name: 'tone',
        label: 'Tone',
        type: 'select',
        options: ['Warm + reassuring', 'Confident + expert', 'Friendly + casual', 'Premium + minimal'],
        defaultValue: 'Warm + reassuring',
      },
      {
        name: 'designStyle',
        label: 'Design style',
        type: 'select',
        options: [
          'Clean + minimal (lots of whitespace)',
          'Bold + colorful (strong gradients)',
          'Editorial / story-driven',
          'Trust-heavy (lots of proof + numbers)',
          'Premium + dark mode',
        ],
        defaultValue: 'Clean + minimal (lots of whitespace)',
      },
      {
        name: 'colorPalette',
        label: 'Preferred color palette / art direction',
        type: 'text',
        placeholder: 'e.g. Forest green, cream, muted gold accents',
      },
      {
        name: 'referenceUrls',
        label: 'Reference URLs / inspiration (one per line)',
        type: 'textarea',
        placeholder: 'https://example.com\nhttps://another-example.com',
      },
      {
        name: 'sections',
        label: 'Sections to include',
        type: 'multiselect',
        options: [
          'Hero',
          'Logo bar / press',
          'Problem / pain points',
          'How it works (3 steps)',
          'Features / benefits',
          'Social proof / testimonials',
          'Numbers / stats',
          'Comparison table',
          'Pricing',
          'FAQ',
          'Final CTA',
          'Footer',
        ],
        defaultValue: [
          'Hero',
          'How it works (3 steps)',
          'Features / benefits',
          'Social proof / testimonials',
          'FAQ',
          'Final CTA',
          'Footer',
        ],
      },
      {
        name: 'keyBenefits',
        label: 'Key benefits / features (one per line)',
        type: 'textarea',
        placeholder: 'e.g.\n- Auto-categorises every transaction\n- Shared family budget with spending alerts\n- Goal-based savings buckets',
      },
      {
        name: 'socialProof',
        label: 'Social proof / testimonials / numbers (optional)',
        type: 'textarea',
        placeholder: 'Paste real testimonials, member counts, ratings — only what you can verify.',
      },
      {
        name: 'outputFormat',
        label: 'Technical output format',
        type: 'select',
        options: ['Responsive HTML', 'React-ready markup', 'HTML with implementation notes'],
        defaultValue: 'Responsive HTML',
      },
      {
        name: 'formIntegration',
        label: 'Form integration / CRM handoff (optional)',
        type: 'text',
        placeholder: 'e.g. HubSpot form embed, Mailchimp webhook, custom POST endpoint',
      },
      { name: 'mustInclude', label: 'Must-include phrases / compliance lines', type: 'textarea' },
      { name: 'avoidWords', label: 'Words / claims to avoid', type: 'textarea' },
    ],
    outputs: [
      { key: 'outline', label: 'Page outline', kind: 'markdown' },
      { key: 'copyBlocks', label: 'Section-by-section copy', kind: 'copy' },
      { key: 'html', label: 'Full HTML page', kind: 'code', downloadExtension: 'html' },
      { key: 'schema', label: 'JSON-LD schema', kind: 'json', downloadExtension: 'json' },
      { key: 'experiments', label: 'A/B tests to run', kind: 'table' },
      { key: 'measurement', label: 'Measurement plan', kind: 'markdown' },
      { key: 'hero', label: 'Hero visual', kind: 'image' },
    ],
    tools: ['profile', 'kpis.acquisition', 'kpis.activation'],
    guardrails: FINANCE_GUARDRAILS,
    successCriteria: [
      ...COMMON_CRITERIA,
      {
        id: 'page_completeness',
        description:
          'Every section listed in the user\u2019s requirements is present in both the copy blocks and the HTML output, in the requested order.',
        weight: 5,
      },
      {
        id: 'html_validity',
        description:
          'HTML block is a single self-contained document, mobile-first responsive, accessible (alt text + aria where needed), and uses Tailwind CDN classes consistently.',
        weight: 5,
      },
      {
        id: 'no_invented_proof',
        description:
          'No fabricated testimonials, names, ratings, or stats — only proof points the user provided are surfaced on the page.',
        weight: 5,
      },
    ],
    model: 'gpt-4o-mini',
    visual: {
      width: 1280,
      height: 720,
      promptHint:
        'Ultra-modern SaaS landing-page hero mockup, screenshot of a polished web product, clean editorial typography with a confident sans-serif headline, soft pastel gradient-mesh / aurora background, subtle glassmorphism cards, a credible product UI mock floating to the right, generous whitespace, premium brand-safe colour palette, photorealistic device frame on a desktop browser, 16:9 composition, no lorem ipsum, no watermark, no stock-photo people',
      provider: 'google',
    },
    tier: 'free',
  },
};

// ─── Baseline factory for the remaining 15 skills ────────────────────────────

function baselineConfig(skill: MarketingSkill): AdvancedSkillConfig {
  return {
    systemPrompt: `You are a senior marketing operator running the **${skill.name}** skill for a personal-finance brand (budgeting, saving and investing for individuals and families, India). You produce structured, prioritised, brand-safe deliverables — not generic advice. Use the live org context provided to ground every recommendation in real numbers.`,
    promptTemplate: `Run the **${skill.name}** skill.

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
        placeholder: 'e.g. +20% paid subscriptions, -15% CAC, 15% referral rate',
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
    guardrails: FINANCE_GUARDRAILS,
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

// Static catalog & UI metadata for marketing-agent.
// Business/KPI/calendar/campaign/etc. data is fetched from the API
// (see services/marketingService.ts). Shared TS types live in ./types.

import type { ContentPillar } from './types';

export type {
  BusinessProfile,
  KpiMetric,
  ContentPillar,
  ContentItem,
  Campaign,
  KeywordCluster,
  SeoPage,
  LifecycleFlow,
  LifecycleFlowStep,
  Experiment,
  ExperimentStatus,
  PlanItem,
} from './types';

// ─── Intake Questions ────────────────────────────────────────────────────────

export interface IntakeQuestion {
  id: string;
  tier: 1 | 2 | 3;
  question: string;
  type: 'text' | 'select' | 'multiselect' | 'number' | 'boolean' | 'textarea';
  options?: string[];
  placeholder?: string;
}

export const intakeQuestions: IntakeQuestion[] = [
  // Tier 1
  {
    id: 'primaryGrowthFocus',
    tier: 1,
    question: 'Who is the primary customer you are growing right now?',
    type: 'select',
    options: ['Patients', 'Providers', 'Both simultaneously'],
  },
  {
    id: 'biggestBottleneck',
    tier: 1,
    question: 'What is your current biggest bottleneck?',
    type: 'select',
    options: ['Supply (not enough providers)', 'Demand (not enough patients)', 'Activation (users sign up but don\'t transact)'],
  },
  {
    id: 'monthlyBudget',
    tier: 1,
    question: 'What is your monthly marketing budget (₹)?',
    type: 'number',
    placeholder: 'e.g. 500000',
  },
  {
    id: 'targetCities',
    tier: 1,
    question: 'Which 2-3 cities are you focusing on for the next 90 days?',
    type: 'multiselect',
    options: ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad'],
  },
  {
    id: 'bestPerforming',
    tier: 1,
    question: 'What has worked best for acquisition so far, even if small?',
    type: 'textarea',
    placeholder: 'e.g. word-of-mouth referrals, specific ad campaign, etc.',
  },
  // Tier 2
  {
    id: 'topPatientPersona',
    tier: 2,
    question: 'Who is your most valuable patient persona (age, condition, income, digital fluency)?',
    type: 'textarea',
    placeholder: 'e.g. Urban professional, 28-38, minor acute conditions, high income, tech-savvy',
  },
  {
    id: 'topReasonPatientChooses',
    tier: 2,
    question: 'What is the #1 reason a patient chooses curex24 over a direct call to a clinic?',
    type: 'textarea',
    placeholder: 'e.g. Speed of booking, home visit option, verified providers',
  },
  {
    id: 'topReasonProviderJoins',
    tier: 2,
    question: 'What is the #1 reason a provider joins and stays on curex24?',
    type: 'textarea',
    placeholder: 'e.g. Steady patient flow, no upfront cost, easy payment processing',
  },
  {
    id: 'topCompetitors',
    tier: 2,
    question: 'Who are your top 3 competitors and how do you beat them?',
    type: 'textarea',
    placeholder: 'e.g. Practo — we beat them on home visit speed; PharmEasy — we offer real-time tracking',
  },
  {
    id: 'founderLedBrand',
    tier: 2,
    question: 'Is there a founder who can be a visible face of the brand?',
    type: 'boolean',
  },
  // Tier 3
  {
    id: 'marketChanges',
    tier: 3,
    question: 'What changed in the market, product, or competitive landscape last quarter?',
    type: 'textarea',
    placeholder: 'e.g. New competitor launched in Mumbai, we added diagnostics feature',
  },
  {
    id: 'lastExperiments',
    tier: 3,
    question: 'Which experiments ran last quarter and what did we learn?',
    type: 'textarea',
    placeholder: 'e.g. Tested Google PMax vs Search — PMax had 40% lower CVR',
  },
  {
    id: 'retentionRates',
    tier: 3,
    question: 'What is the current retention rate at Day 7, Day 30, Day 90?',
    type: 'textarea',
    placeholder: 'e.g. D7: 45%, D30: 22%, D90: 13%',
  },
];

// ─── Content Pillar UI Metadata ──────────────────────────────────────────────

export const contentPillarMeta: Record<ContentPillar, { label: string; color: string; icon: string }> = {
  'patient-education': { label: 'Patient Education', color: 'bg-blue-100 text-blue-700', icon: '📚' },
  'provider-spotlight': { label: 'Provider Spotlight', color: 'bg-purple-100 text-purple-700', icon: '⭐' },
  'product-education': { label: 'Product Education', color: 'bg-green-100 text-green-700', icon: '📱' },
  'social-proof': { label: 'Social Proof', color: 'bg-yellow-100 text-yellow-700', icon: '🏆' },
  'local-health': { label: 'Local Health', color: 'bg-red-100 text-red-700', icon: '🏙️' },
};

// ─── Marketing Skills Catalog ────────────────────────────────────────────────

export type MarketingSkillCategory =
  | 'Conversion Optimization'
  | 'Content & Copy'
  | 'SEO & Discovery'
  | 'Paid & Distribution'
  | 'Measurement & Testing'
  | 'Retention'
  | 'Growth Engineering'
  | 'Strategy & Monetization'
  | 'Sales & RevOps'
  | 'Not Applicable';

export interface MarketingSkill {
  id: string;
  name: string;
  category: MarketingSkillCategory;
  icon: string;
  description: string;
  examplePrompt: string;
}

export const marketingSkills: MarketingSkill[] = [
  // Measurement & Testing
  {
    id: 'ab-test-setup',
    name: 'A/B Test Setup',
    category: 'Measurement & Testing',
    icon: '🧪',
    description: 'Plan, design, or implement an A/B test or experiment, or build a growth experimentation program.',
    examplePrompt: 'Design an A/B test for the curex24 home-page hero — give me the hypothesis, variants, sample size, and success metric.',
  },
  {
    id: 'analytics-tracking',
    name: 'Analytics Tracking',
    category: 'Measurement & Testing',
    icon: '📊',
    description: 'Set up, improve, or audit analytics tracking and measurement (events, conversions, attribution).',
    examplePrompt: 'Set up GA4 + Meta Pixel event tracking for the curex24 booking funnel — list every event, parameter, and where to fire it.',
  },

  // Paid & Distribution
  {
    id: 'ad-creative',
    name: 'Ad Creative',
    category: 'Paid & Distribution',
    icon: '🎯',
    description: 'Generate, iterate, or scale ad creative — headlines, descriptions, primary text, or full ad sets.',
    examplePrompt: 'Generate 10 Meta ad creative variations for curex24 patient acquisition — headlines, primary text, and visual direction.',
  },
  {
    id: 'paid-ads',
    name: 'Paid Ads',
    category: 'Paid & Distribution',
    icon: '💸',
    description: 'Help with paid advertising campaigns on Google Ads, Meta, LinkedIn, Twitter/X, and more.',
    examplePrompt: 'Plan a ₹3L Google Search campaign for curex24 — campaign structure, keyword themes, bidding, and negatives.',
  },

  // SEO & Discovery
  {
    id: 'ai-seo',
    name: 'AI SEO',
    category: 'SEO & Discovery',
    icon: '🤖',
    description: 'Optimize content for AI search engines, get cited by LLMs, or appear in AI-generated answers (AEO/GEO/LLMO).',
    examplePrompt: 'Optimize the curex24 "home doctor visit" page so it gets cited by ChatGPT and Perplexity for healthcare queries.',
  },
  {
    id: 'seo-audit',
    name: 'SEO Audit',
    category: 'SEO & Discovery',
    icon: '🔍',
    description: 'Audit, review, or diagnose SEO issues on a site — technical, on-page, and content.',
    examplePrompt: 'Run an SEO audit on curex24.com and rank the top 10 fixes by impact and effort.',
  },
  {
    id: 'programmatic-seo',
    name: 'Programmatic SEO',
    category: 'SEO & Discovery',
    icon: '🧬',
    description: 'Create SEO-driven pages at scale using templates and structured data.',
    examplePrompt: 'Design a programmatic SEO template for "[doctor type] in [city]" landing pages for curex24.',
  },
  {
    id: 'site-architecture',
    name: 'Site Architecture',
    category: 'SEO & Discovery',
    icon: '🗺️',
    description: 'Plan, map, or restructure page hierarchy, navigation, URL structure, and internal linking.',
    examplePrompt: 'Propose an information architecture for curex24.com that supports patients, providers, and SEO long-tail.',
  },
  {
    id: 'competitor-alternatives',
    name: 'Competitor / Alternatives',
    category: 'Not Applicable',
    icon: '⚔️',
    description: 'Create competitor comparison or alternative pages for SEO and sales enablement.',
    examplePrompt: 'Write a "curex24 vs Practo" comparison page optimised for SEO and bottom-of-funnel conversion.',
  },
  {
    id: 'schema-markup',
    name: 'Schema Markup',
    category: 'SEO & Discovery',
    icon: '🏷️',
    description: 'Add, fix, or optimize schema markup and structured data on a site.',
    examplePrompt: 'Generate JSON-LD schema for a curex24 doctor profile page (Physician + Service + AggregateRating).',
  },
  {
    id: 'aso-audit',
    name: 'ASO Audit',
    category: 'SEO & Discovery',
    icon: '📱',
    description: 'Audit or optimize an App Store or Google Play listing.',
    examplePrompt: 'Audit the curex24 Play Store listing — title, subtitle, screenshots, keywords, and conversion improvements.',
  },

  // Retention
  {
    id: 'churn-prevention',
    name: 'Churn Prevention',
    category: 'Retention',
    icon: '🛡️',
    description: 'Reduce churn, build cancellation flows, set up save offers, recover failed payments, or run dunning.',
    examplePrompt: 'Design a 4-step cancellation save-flow for curex24 patients with personalised offers and surveys.',
  },

  // Content & Copy
  {
    id: 'cold-email',
    name: 'Cold Email',
    category: 'Not Applicable',
    icon: '📧',
    description: 'Write B2B cold emails and follow-up sequences that get replies.',
    examplePrompt: 'Write a 4-step cold email sequence to corporate HR teams pitching curex24 employee health benefits.',
  },
  {
    id: 'copywriting',
    name: 'Copywriting',
    category: 'Content & Copy',
    icon: '✍️',
    description: 'Write, rewrite, or improve marketing copy for any page — homepage, landing pages, features, pricing.',
    examplePrompt: 'Rewrite the curex24 homepage hero section using a problem-agitation-solution framework.',
  },
  {
    id: 'copy-editing',
    name: 'Copy Editing',
    category: 'Content & Copy',
    icon: '📝',
    description: 'Edit, review, or improve existing marketing copy, or refresh outdated content.',
    examplePrompt: 'Edit this draft of our LinkedIn provider recruitment post for clarity, brevity, and tone.',
  },
  {
    id: 'email-sequence',
    name: 'Email Sequence',
    category: 'Content & Copy',
    icon: '📬',
    description: 'Create or optimize an email sequence, drip campaign, automated email flow, or lifecycle email.',
    examplePrompt: 'Build a 7-email patient onboarding sequence for curex24 — goal: first booking within 14 days.',
  },
  {
    id: 'social-content',
    name: 'Social Content',
    category: 'Content & Copy',
    icon: '📲',
    description: 'Create, schedule, or optimize social content for LinkedIn, Twitter/X, Instagram, and more.',
    examplePrompt: 'Draft 5 LinkedIn posts about curex24’s home-doctor model — mix of education, story, and CTA.',
  },

  // Conversion Optimization
  {
    id: 'page-cro',
    name: 'Page CRO',
    category: 'Conversion Optimization',
    icon: '📈',
    description: 'Optimize, improve, or increase conversions on any marketing page — homepage, landing pages, etc.',
    examplePrompt: 'Audit the curex24 booking landing page and propose 8 prioritised CRO experiments.',
  },
  {
    id: 'signup-flow-cro',
    name: 'Signup Flow CRO',
    category: 'Conversion Optimization',
    icon: '🚪',
    description: 'Optimize signup, registration, account creation, or trial activation flows.',
    examplePrompt: 'Reduce friction in the curex24 patient signup flow — current drop-off is 38% on phone-OTP step.',
  },
  {
    id: 'onboarding-cro',
    name: 'Onboarding CRO',
    category: 'Conversion Optimization',
    icon: '🧭',
    description: 'Optimize post-signup onboarding, user activation, first-run experience, or time-to-value.',
    examplePrompt: 'Redesign curex24 first-run onboarding to lift signup→first-booking from 28% to 40%.',
  },
  {
    id: 'form-cro',
    name: 'Form CRO',
    category: 'Not Applicable',
    icon: '🧾',
    description: 'Optimize lead capture, contact, or non-signup forms for higher completion rates.',
    examplePrompt: 'Improve the curex24 corporate-enquiry form — 12 fields today, 4% completion rate.',
  },
  {
    id: 'popup-cro',
    name: 'Popup CRO',
    category: 'Conversion Optimization',
    icon: '🪟',
    description: 'Create or optimize popups, modals, overlays, slide-ins, or banners for conversion.',
    examplePrompt: 'Design an exit-intent popup for the curex24 pricing page that captures email + offers ₹100 off.',
  },
  {
    id: 'paywall-upgrade-cro',
    name: 'Paywall / Upgrade CRO',
    category: 'Conversion Optimization',
    icon: '🔓',
    description: 'Create or optimize in-app paywalls, upgrade screens, upsell modals, or feature gates.',
    examplePrompt: 'Design an in-app upgrade screen prompting curex24 patients to subscribe to the annual care plan.',
  },

  // Customer & Strategy
  {
    id: 'customer-research',
    name: 'Customer Research',
    category: 'Strategy & Monetization',
    icon: '🧠',
    description: 'Conduct, analyze, or synthesize customer research — interviews, surveys, JTBD.',
    examplePrompt: 'Plan 8 customer interviews with curex24 active patients — recruitment script, questions, and synthesis template.',
  },
  {
    id: 'content-strategy',
    name: 'Content Strategy',
    category: 'Strategy & Monetization',
    icon: '🧱',
    description: 'Plan a content strategy, decide what content to create, or figure out what topics to cover.',
    examplePrompt: 'Build a 90-day content strategy for the curex24 blog — pillars, topics, and distribution plan.',
  },
  {
    id: 'launch-strategy',
    name: 'Launch Strategy',
    category: 'Strategy & Monetization',
    icon: '🚀',
    description: 'Plan a product launch, feature announcement, or release strategy.',
    examplePrompt: 'Plan a launch for curex24’s new mental-health home-visit service — channels, sequence, and assets.',
  },
  {
    id: 'marketing-ideas',
    name: 'Marketing Ideas',
    category: 'Strategy & Monetization',
    icon: '💡',
    description: 'Get marketing ideas, inspiration, or strategies for a SaaS or software product.',
    examplePrompt: 'Give me 20 unconventional growth ideas for curex24 — specifically for the Mumbai market.',
  },
  {
    id: 'marketing-psychology',
    name: 'Marketing Psychology',
    category: 'Strategy & Monetization',
    icon: '🎭',
    description: 'Apply psychological principles, mental models, or behavioural science to marketing.',
    examplePrompt: 'Apply behavioural-science principles to lift curex24 referral participation from 9% to 15%.',
  },
  {
    id: 'pricing-strategy',
    name: 'Pricing Strategy',
    category: 'Strategy & Monetization',
    icon: '💰',
    description: 'Help with pricing decisions, packaging, or monetization strategy.',
    examplePrompt: 'Propose a 3-tier pricing/packaging model for curex24 home-visit subscriptions.',
  },
  {
    id: 'product-marketing-context',
    name: 'Product Marketing Context',
    category: 'Strategy & Monetization',
    icon: '🧩',
    description: 'Create or update the product marketing context document — positioning, ICP, audience, messaging.',
    examplePrompt: 'Build the product marketing context doc for curex24 — ICP, positioning, value props, and key messages.',
  },

  // Growth Engineering
  {
    id: 'free-tool-strategy',
    name: 'Free Tool Strategy',
    category: 'Not Applicable',
    icon: '🛠️',
    description: 'Plan, evaluate, or build a free tool for marketing — lead generation, SEO value, or virality.',
    examplePrompt: 'Design a free "BMI + home health risk" tool for curex24 to drive organic traffic and email signups.',
  },
  {
    id: 'lead-magnets',
    name: 'Lead Magnets',
    category: 'Not Applicable',
    icon: '🧲',
    description: 'Create, plan, or optimize a lead magnet for email capture or lead generation.',
    examplePrompt: 'Create a downloadable "Family Health Calendar" lead magnet for curex24 — outline + landing page copy.',
  },
  {
    id: 'referral-program',
    name: 'Referral Program',
    category: 'Growth Engineering',
    icon: '🔗',
    description: 'Create, optimize, or analyze a referral program, affiliate program, or word-of-mouth strategy.',
    examplePrompt: 'Design a 2-sided referral program for curex24 patients — incentives, mechanics, and launch plan.',
  },
  {
    id: 'community-marketing',
    name: 'Community Marketing',
    category: 'Growth Engineering',
    icon: '🫂',
    description: 'Build and leverage online communities to drive product growth and brand loyalty.',
    examplePrompt: 'Launch a curex24 patient community on WhatsApp + Reddit — name, content plan, and 30-day calendar.',
  },

  // Sales & RevOps
  {
    id: 'revops',
    name: 'RevOps',
    category: 'Not Applicable',
    icon: '🧮',
    description: 'Help with revenue operations, lead lifecycle, scoring, routing, and pipeline management.',
    examplePrompt: 'Design a lead-scoring + routing model for curex24’s corporate (B2B) pipeline.',
  },
  {
    id: 'sales-enablement',
    name: 'Sales Enablement',
    category: 'Not Applicable',
    icon: '📑',
    description: 'Create sales collateral — pitch decks, one-pagers, objection handling docs, demo scripts.',
    examplePrompt: 'Create a 10-slide pitch deck for curex24 corporate-wellness sales calls.',
  },
];

export const marketingSkillCategories: MarketingSkillCategory[] = [
  'Conversion Optimization',
  'Content & Copy',
  'SEO & Discovery',
  'Paid & Distribution',
  'Measurement & Testing',
  'Retention',
  'Growth Engineering',
  'Strategy & Monetization',
];

// Skills tagged with this category are hidden by default in the Skills Library
// because they don't fit curex24's current B2C home-doctor / care-plan focus
// (B2B-only motions, comparison pages, generic free tools, etc.). They are
// surfaced behind an opt-in "Not Applicable" section so the agent's default
// surface area stays focused without losing access to them.
export const notApplicableSkillCategory: MarketingSkillCategory = 'Not Applicable';

// ─── Sample Agent Conversation (placeholder) ─────────────────────────────────

export interface AgentMessage {
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  imagePrompt?: string;
}

export const sampleConversation: AgentMessage[] = [
  {
    role: 'agent',
    content: `👋 Hello! I'm your curex24 Marketing Agent — your AI CMO and hands-on marketing operator.

I can help you with:
• **Strategy** — brand positioning, GTM, audience targeting
• **Campaigns** — briefs, ad copy, landing page copy
• **Content** — calendar, blog ideas, social posts, SEO
• **Lifecycle** — email flows, re-engagement, retention
• **Analytics** — KPI tracking, experiment design, reporting
• **Growth** — referral programs, partnerships, influencer outreach

To get started, I recommend completing the **Business Intake** form so I can tailor all recommendations to your specific stage, budget, and goals.

What would you like to work on today?`,
    timestamp: '09:00',
  },
  {
    role: 'user',
    content: "What should I focus on this week?",
    timestamp: '09:01',
  },
  {
    role: 'agent',
    content: `Based on your current data, here are this week's **top 3 priorities**:

**🔴 Priority 1: Provider Supply (Critical)**
Your active provider count is at 148 vs a target of 200. This is the #1 constraint on your growth — you cannot acquire more patients if supply can't absorb demand.
→ **Action:** Launch LinkedIn provider recruitment campaign this week. Use the brief in the Campaigns section. Budget: ₹20,000.

**🟡 Priority 2: Booking Completion Rate (At Risk)**
Only 28% of signups book within 7 days vs your 35% target. The Day 3 incentive email in your onboarding flow has the highest leverage here.
→ **Action:** A/B test the Day 3 email subject line (discount-led vs urgency-led). The experiment is already set up — activate it today.

**🟢 Quick Win: Referral Program**
Referrals are only 9% of new signups vs 15% target. The post-booking referral ask is the easiest lever.
→ **Action:** Add a referral CTA to your post-booking screen. This is a 1-day engineering task with high ROI.

Want me to draft the provider recruitment ad copy or the referral screen copy?`,
    timestamp: '09:01',
  },
];

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
    options: ['Members (free users)', 'Subscribers (paid users)', 'Both simultaneously'],
  },
  {
    id: 'biggestBottleneck',
    tier: 1,
    question: 'What is your current biggest bottleneck?',
    type: 'select',
    options: [
      'Acquisition (not enough new signups)',
      'Activation (users sign up but don\u2019t set up their first budget / link an account)',
      'Subscription conversion (free users don\u2019t upgrade to paid)',
    ],
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
    placeholder: 'e.g. word-of-mouth referrals, a specific search campaign, an SIP-calculator landing page, etc.',
  },
  // Tier 2
  {
    id: 'topMemberPersona',
    tier: 2,
    question: 'Who is your most valuable member persona (age, life-stage, income, digital fluency)?',
    type: 'textarea',
    placeholder: 'e.g. Salaried urban professional, 28–38, household income ₹15–30L, first-time investor, tech-savvy',
  },
  {
    id: 'topReasonMemberJoins',
    tier: 2,
    question: 'What is the #1 reason a member signs up for your free product?',
    type: 'textarea',
    placeholder: 'e.g. Simple budgeting that works for the whole household, jargon-free explanations',
  },
  {
    id: 'topReasonMemberSubscribes',
    tier: 2,
    question: 'What is the #1 reason a member upgrades to a paid subscription?',
    type: 'textarea',
    placeholder: 'e.g. Family-shared dashboards, goal-based investing, premium tax tools',
  },
  {
    id: 'topCompetitors',
    tier: 2,
    question: 'Who are your top 3 competitors and how do you beat them?',
    type: 'textarea',
    placeholder: 'e.g. Competitor A — we beat them on family/circle features; Competitor B — we offer transparent fixed pricing',
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
    placeholder: 'e.g. RBI rate cut moved demand for SIP content, we added a tax-planning module',
  },
  {
    id: 'lastExperiments',
    tier: 3,
    question: 'Which experiments ran last quarter and what did we learn?',
    type: 'textarea',
    placeholder: 'e.g. Tested Google PMax vs Search — PMax had 40% lower CVR on paid signups',
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
  'budgeting': { label: 'Budgeting & Money Habits', color: 'bg-blue-100 text-blue-700', icon: '💸' },
  'saving-investing': { label: 'Saving & Investing', color: 'bg-purple-100 text-purple-700', icon: '📈' },
  'product-education': { label: 'Product Education', color: 'bg-green-100 text-green-700', icon: '📱' },
  'social-proof': { label: 'Social Proof', color: 'bg-yellow-100 text-yellow-700', icon: '🏆' },
  'family-finance': { label: 'Family Finance', color: 'bg-red-100 text-red-700', icon: '👨\u200d👩\u200d👧' },
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
    examplePrompt: 'Design an A/B test for your home-page hero — give me the hypothesis, variants, sample size, and success metric.',
  },
  {
    id: 'analytics-tracking',
    name: 'Analytics Tracking',
    category: 'Measurement & Testing',
    icon: '📊',
    description: 'Set up, improve, or audit analytics tracking and measurement (events, conversions, attribution).',
    examplePrompt: 'Set up GA4 + Meta Pixel event tracking for your signup → paid-subscription funnel — list every event, parameter, and where to fire it.',
  },

  // Paid & Distribution
  {
    id: 'ad-creative',
    name: 'Ad Creative',
    category: 'Paid & Distribution',
    icon: '🎯',
    description: 'Generate, iterate, or scale ad creative — headlines, descriptions, primary text, or full ad sets.',
    examplePrompt: 'Generate 10 Meta ad creative variations for member acquisition — headlines, primary text, and visual direction.',
  },
  {
    id: 'paid-ads',
    name: 'Paid Ads',
    category: 'Paid & Distribution',
    icon: '💸',
    description: 'Help with paid advertising campaigns on Google Ads, Meta, LinkedIn, Twitter/X, and more.',
    examplePrompt: 'Plan a ₹3L Google Search campaign for personal finance keywords — campaign structure, keyword themes, bidding, and negatives.',
  },

  // SEO & Discovery
  {
    id: 'ai-seo',
    name: 'AI SEO',
    category: 'SEO & Discovery',
    icon: '🤖',
    description: 'Optimize content for AI search engines, get cited by LLMs, or appear in AI-generated answers (AEO/GEO/LLMO).',
    examplePrompt: 'Optimize your "best budgeting app for families" page so it gets cited by ChatGPT and Perplexity for personal-finance queries.',
  },
  {
    id: 'seo-audit',
    name: 'SEO Audit',
    category: 'SEO & Discovery',
    icon: '🔍',
    description: 'Audit, review, or diagnose SEO issues on a site — technical, on-page, and content.',
    examplePrompt: 'Run an SEO audit on example.com and rank the top 10 fixes by impact and effort.',
  },
  {
    id: 'programmatic-seo',
    name: 'Programmatic SEO',
    category: 'Not Applicable',
    icon: '🧬',
    description: 'Create SEO-driven pages at scale using templates and structured data.',
    examplePrompt: 'Design a programmatic SEO template for "[calculator type] in [city]" landing pages (SIP, EMI, FD, tax) for organic acquisition.',
  },
  {
    id: 'site-architecture',
    name: 'Site Architecture',
    category: 'Not Applicable',
    icon: '🗺️',
    description: 'Plan, map, or restructure page hierarchy, navigation, URL structure, and internal linking.',
    examplePrompt: 'Propose an information architecture for example.com that supports members, paid subscribers, and SEO long-tail.',
  },
  {
    id: 'competitor-alternatives',
    name: 'Competitor / Alternatives',
    category: 'Not Applicable',
    icon: '⚔️',
    description: 'Create competitor comparison or alternative pages for SEO and sales enablement.',
    examplePrompt: 'Write a "your brand vs Competitor A" comparison page optimised for SEO and bottom-of-funnel conversion.',
  },
  {
    id: 'schema-markup',
    name: 'Schema Markup',
    category: 'Not Applicable',
    icon: '🏷️',
    description: 'Add, fix, or optimize schema markup and structured data on a site.',
    examplePrompt: 'Generate JSON-LD schema for your SIP calculator page (FinancialProduct + SoftwareApplication + AggregateRating).',
  },
  {
    id: 'aso-audit',
    name: 'ASO Audit',
    category: 'SEO & Discovery',
    icon: '📱',
    description: 'Audit or optimize an App Store or Google Play listing.',
    examplePrompt: 'Audit your Play Store listing — title, subtitle, screenshots, keywords, and conversion improvements.',
  },

  // Retention
  {
    id: 'churn-prevention',
    name: 'Churn Prevention',
    category: 'Retention',
    icon: '🛡️',
    description: 'Reduce churn, build cancellation flows, set up save offers, recover failed payments, or run dunning.',
    examplePrompt: 'Design a 4-step cancellation save-flow for paid subscribers with personalised offers and surveys.',
  },

  // Content & Copy
  {
    id: 'cold-email',
    name: 'Cold Email',
    category: 'Not Applicable',
    icon: '📧',
    description: 'Write B2B cold emails and follow-up sequences that get replies.',
    examplePrompt: 'Write a 4-step cold email sequence to corporate HR teams pitching a financial-wellness benefit.',
  },
  {
    id: 'copywriting',
    name: 'Copywriting',
    category: 'Content & Copy',
    icon: '✍️',
    description: 'Write, rewrite, or improve marketing copy for any page — homepage, landing pages, features, pricing.',
    examplePrompt: 'Rewrite your homepage hero section using a problem-agitation-solution framework.',
  },
  {
    id: 'copy-editing',
    name: 'Copy Editing',
    category: 'Content & Copy',
    icon: '📝',
    description: 'Edit, review, or improve existing marketing copy, or refresh outdated content.',
    examplePrompt: 'Edit this draft of our LinkedIn post about SIP investing for clarity, brevity, and tone.',
  },
  {
    id: 'email-sequence',
    name: 'Email Sequence',
    category: 'Content & Copy',
    icon: '📬',
    description: 'Create or optimize an email sequence, drip campaign, automated email flow, or lifecycle email.',
    examplePrompt: 'Build a 7-email member onboarding sequence — goal: first budget set up + first savings goal within 14 days.',
  },
  {
    id: 'social-content',
    name: 'Social Content',
    category: 'Content & Copy',
    icon: '📲',
    description: 'Create, schedule, or optimize social content for LinkedIn, Twitter/X, Instagram, and more.',
    examplePrompt: 'Draft 5 LinkedIn posts about your family-finance product — mix of education, story, and CTA.',
  },

  // Conversion Optimization
  {
    id: 'landing-page',
    name: 'Landing Page Builder',
    category: 'Conversion Optimization',
    icon: '🛬',
    description:
      'Generate a complete landing page from your requirements — structured outline, ready-to-ship copy blocks, responsive HTML, JSON-LD schema, and a hero visual.',
    examplePrompt:
      'Build a landing page for our new family budgeting plan — audience: dual-income parents in metros, goal: free signup, include hero, social proof, 3 features, FAQ, and CTA.',
  },
  {
    id: 'page-cro',
    name: 'Page CRO',
    category: 'Conversion Optimization',
    icon: '📈',
    description: 'Optimize, improve, or increase conversions on any marketing page — homepage, landing pages, etc.',
    examplePrompt: 'Audit your pricing landing page and propose 8 prioritised CRO experiments.',
  },
  {
    id: 'signup-flow-cro',
    name: 'Signup Flow CRO',
    category: 'Conversion Optimization',
    icon: '🚪',
    description: 'Optimize signup, registration, account creation, or trial activation flows.',
    examplePrompt: 'Reduce friction in your signup flow — current drop-off is 38% on the phone-OTP step.',
  },
  {
    id: 'onboarding-cro',
    name: 'Onboarding CRO',
    category: 'Conversion Optimization',
    icon: '🧭',
    description: 'Optimize post-signup onboarding, user activation, first-run experience, or time-to-value.',
    examplePrompt: 'Redesign your first-run onboarding to lift signup → first-budget-set-up from 28% to 40%.',
  },
  {
    id: 'form-cro',
    name: 'Form CRO',
    category: 'Not Applicable',
    icon: '🧾',
    description: 'Optimize lead capture, contact, or non-signup forms for higher completion rates.',
    examplePrompt: 'Improve your corporate-enquiry form — 12 fields today, 4% completion rate.',
  },
  {
    id: 'popup-cro',
    name: 'Popup CRO',
    category: 'Not Applicable',
    icon: '🪟',
    description: 'Create or optimize popups, modals, overlays, slide-ins, or banners for conversion.',
    examplePrompt: 'Design an exit-intent popup for your pricing page that captures email + offers ₹100 off the first month.',
  },
  {
    id: 'paywall-upgrade-cro',
    name: 'Paywall / Upgrade CRO',
    category: 'Not Applicable',
    icon: '🔓',
    description: 'Create or optimize in-app paywalls, upgrade screens, upsell modals, or feature gates.',
    examplePrompt: 'Design an in-app upgrade screen prompting free members to subscribe to the annual family plan.',
  },

  // Customer & Strategy
  {
    id: 'customer-research',
    name: 'Customer Research',
    category: 'Strategy & Monetization',
    icon: '🧠',
    description: 'Conduct, analyze, or synthesize customer research — interviews, surveys, JTBD.',
    examplePrompt: 'Plan 8 customer interviews with active members — recruitment script, questions, and synthesis template.',
  },
  {
    id: 'content-strategy',
    name: 'Content Strategy',
    category: 'Not Applicable',
    icon: '🧱',
    description: 'Plan a content strategy, decide what content to create, or figure out what topics to cover.',
    examplePrompt: 'Build a 90-day content strategy for your blog — pillars, topics, and distribution plan.',
  },
  {
    id: 'launch-strategy',
    name: 'Launch Strategy',
    category: 'Not Applicable',
    icon: '🚀',
    description: 'Plan a product launch, feature announcement, or release strategy.',
    examplePrompt: 'Plan a launch for your new tax-planning module — channels, sequence, and assets.',
  },
  {
    id: 'marketing-ideas',
    name: 'Marketing Ideas',
    category: 'Not Applicable',
    icon: '💡',
    description: 'Get marketing ideas, inspiration, or strategies for a SaaS or software product.',
    examplePrompt: 'Give me 20 unconventional growth ideas for your finance app — specifically for the Mumbai market.',
  },
  {
    id: 'marketing-psychology',
    name: 'Marketing Psychology',
    category: 'Not Applicable',
    icon: '🎭',
    description: 'Apply psychological principles, mental models, or behavioural science to marketing.',
    examplePrompt: 'Apply behavioural-science principles to lift your referral participation from 9% to 15%.',
  },
  {
    id: 'pricing-strategy',
    name: 'Pricing Strategy',
    category: 'Strategy & Monetization',
    icon: '💰',
    description: 'Help with pricing decisions, packaging, or monetization strategy.',
    examplePrompt: 'Propose a 3-tier pricing/packaging model for your individual + family-circle finance subscriptions.',
  },
  {
    id: 'product-marketing-context',
    name: 'Product Marketing Context',
    category: 'Strategy & Monetization',
    icon: '🧩',
    description: 'Create or update the product marketing context document — positioning, ICP, audience, messaging.',
    examplePrompt: 'Build the product marketing context doc for your finance app — ICP, positioning, value props, and key messages.',
  },

  // Growth Engineering
  {
    id: 'free-tool-strategy',
    name: 'Free Tool Strategy',
    category: 'Not Applicable',
    icon: '🛠️',
    description: 'Plan, evaluate, or build a free tool for marketing — lead generation, SEO value, or virality.',
    examplePrompt: 'Design a free "monthly budget + savings calculator" tool to drive organic traffic and email signups.',
  },
  {
    id: 'lead-magnets',
    name: 'Lead Magnets',
    category: 'Not Applicable',
    icon: '🧲',
    description: 'Create, plan, or optimize a lead magnet for email capture or lead generation.',
    examplePrompt: 'Create a downloadable "Family Money Calendar" lead magnet — outline + landing page copy.',
  },
  {
    id: 'referral-program',
    name: 'Referral Program',
    category: 'Growth Engineering',
    icon: '🔗',
    description: 'Create, optimize, or analyze a referral program, affiliate program, or word-of-mouth strategy.',
    examplePrompt: 'Design a 2-sided referral program for members — incentives, mechanics, and launch plan.',
  },
  {
    id: 'community-marketing',
    name: 'Community Marketing',
    category: 'Growth Engineering',
    icon: '🫂',
    description: 'Build and leverage online communities to drive product growth and brand loyalty.',
    examplePrompt: 'Launch your member community on WhatsApp + Reddit — name, content plan, and 30-day calendar.',
  },

  // Sales & RevOps
  {
    id: 'revops',
    name: 'RevOps',
    category: 'Not Applicable',
    icon: '🧮',
    description: 'Help with revenue operations, lead lifecycle, scoring, routing, and pipeline management.',
    examplePrompt: 'Design a lead-scoring + routing model for your B2B financial-wellness pipeline.',
  },
  {
    id: 'sales-enablement',
    name: 'Sales Enablement',
    category: 'Not Applicable',
    icon: '📑',
    description: 'Create sales collateral — pitch decks, one-pagers, objection handling docs, demo scripts.',
    examplePrompt: 'Create a 10-slide pitch deck for your B2B financial-wellness sales calls.',
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
// because they don't fit the current B2C member / paid-subscription focus
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
    content: `👋 Hello! I'm your Marketing Agent — your AI CMO and hands-on marketing operator.

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

**🔴 Priority 1: Paid Subscription Conversion (Critical)**
Your active paid-subscriber count is at 148 vs a target of 200. Free → paid conversion is the #1 constraint on revenue right now.
→ **Action:** Launch the in-app upgrade nudge for members who have set up 2+ savings goals. Use the brief in the Campaigns section. Budget: ₹20,000.

**🟡 Priority 2: Activation Rate (At Risk)**
Only 28% of signups set up their first budget within 7 days vs your 35% target. The Day 3 incentive email in your onboarding flow has the highest leverage here.
→ **Action:** A/B test the Day 3 email subject line (discount-led vs urgency-led). The experiment is already set up — activate it today.

**🟢 Quick Win: Referral Program**
Referrals are only 9% of new signups vs 15% target. The post-first-budget referral ask is the easiest lever.
→ **Action:** Add a referral CTA to your post-budget-setup screen. This is a 1-day engineering task with high ROI.

Want me to draft the upgrade nudge copy or the referral screen copy?`,
    timestamp: '09:01',
  },
];

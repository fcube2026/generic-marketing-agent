'use client';

import { useState } from 'react';
import { GeneratedImage } from '@/components/ui/GeneratedImage';
import { ImageProviderToggle } from '@/components/ui/ImageProviderToggle';

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORMS_POST = ['Instagram', 'LinkedIn', 'Twitter/X', 'Facebook', 'WhatsApp'] as const;
const CONTENT_PILLARS = [
  'Education & Awareness',
  'Trust & Social Proof',
  'Product/Service Highlight',
  'Brand Story',
  'Community & Engagement',
  'Offer & Promotion',
] as const;
const TONES = ['Professional', 'Conversational', 'Inspirational', 'Witty', 'Empathetic', 'Bold'] as const;

const FORMAT_TYPES = [
  'Square Post (1:1)',
  'Portrait Post (4:5)',
  'Story / Reel (9:16)',
  'Landscape Banner (16:9)',
  'Twitter/X Card (2:1)',
  'LinkedIn Banner (4:1)',
  'Pinterest Pin (2:3)',
  'YouTube Thumbnail (16:9)',
  'Facebook Cover (2.7:1)',
  'WhatsApp Status (9:16)',
] as const;
const VISUAL_STYLES = [
  'Photorealistic',
  'Flat Illustration',
  'Minimalist',
  'Bold & Typographic',
  'Cinematic',
  'Watercolour',
  'Neon / Dark Mode',
] as const;
const AI_TOOLS = ['OpenAI dall-e-3', 'Google Nano Banana'] as const;

const TOOL_TO_PROVIDER: Record<typeof AI_TOOLS[number], 'openai' | 'google'> = {
  'OpenAI dall-e-3': 'openai',
  'Google Nano Banana': 'google',
};

const FORMAT_DIMENSIONS: Record<typeof FORMAT_TYPES[number], string> = {
  'Square Post (1:1)': '1080×1080 px, aspect ratio 1:1',
  'Portrait Post (4:5)': '1080×1350 px, aspect ratio 4:5',
  'Story / Reel (9:16)': '1080×1920 px, aspect ratio 9:16',
  'Landscape Banner (16:9)': '1920×1080 px, aspect ratio 16:9',
  'Twitter/X Card (2:1)': '1200×600 px, aspect ratio 2:1',
  'LinkedIn Banner (4:1)': '1584×396 px, aspect ratio 4:1',
  'Pinterest Pin (2:3)': '1000×1500 px, aspect ratio 2:3',
  'YouTube Thumbnail (16:9)': '1280×720 px, aspect ratio 16:9',
  'Facebook Cover (2.7:1)': '820×312 px, aspect ratio 2.7:1',
  'WhatsApp Status (9:16)': '1080×1920 px, aspect ratio 9:16',
};

// Closest Pollinations-friendly pixel dimensions per format
const FORMAT_PIXELS: Record<typeof FORMAT_TYPES[number], { w: number; h: number }> = {
  'Square Post (1:1)': { w: 1024, h: 1024 },
  'Portrait Post (4:5)': { w: 820, h: 1024 },
  'Story / Reel (9:16)': { w: 576, h: 1024 },
  'Landscape Banner (16:9)': { w: 1024, h: 576 },
  'Twitter/X Card (2:1)': { w: 1024, h: 512 },
  'LinkedIn Banner (4:1)': { w: 1024, h: 256 },
  'Pinterest Pin (2:3)': { w: 682, h: 1024 },
  'YouTube Thumbnail (16:9)': { w: 1024, h: 576 },
  'Facebook Cover (2.7:1)': { w: 1024, h: 379 },
  'WhatsApp Status (9:16)': { w: 576, h: 1024 },
};

// Social post dimensions for Pollinations
const POST_PLATFORM_PIXELS: Record<string, { w: number; h: number }> = {
  Instagram: { w: 1024, h: 1024 },
  LinkedIn: { w: 1024, h: 536 },
  'Twitter/X': { w: 1024, h: 512 },
  Facebook: { w: 1024, h: 536 },
  WhatsApp: { w: 1024, h: 1024 },
};

const AD_PLATFORMS = ['Google Search', 'Google Display', 'Meta (Facebook/Instagram)', 'LinkedIn Ads', 'YouTube Ads', 'WhatsApp Ads'] as const;
const CAMPAIGN_OBJECTIVES = [
  'Brand Awareness',
  'Member Acquisition',
  'Subscription Upgrade',
  'App Install',
  'Re-engagement / Retargeting',
  'Seasonal Offer',
] as const;

// ─── Image Prompt Builders ────────────────────────────────────────────────────

function buildImagePromptForVisual(
  format: typeof FORMAT_TYPES[number],
  style: typeof VISUAL_STYLES[number],
  customSubject?: string,
): string {
  const conceptMap: Record<typeof FORMAT_TYPES[number], string> = {
    'Square Post (1:1)': 'warm welcoming scene of a young Indian couple reviewing a personal-finance app on a phone at a bright modern kitchen table',
    'Portrait Post (4:5)': 'close-up portrait of a confident smiling young Indian professional holding a smartphone showing a budget app, soft bokeh home background',
    'Story / Reel (9:16)': 'full-height vertical social media visual, young Indian professional smiling at goal-progress screen on phone in bright daylight, warm colour palette, mobile-first composition',
    'Landscape Banner (16:9)': 'wide-angle scene of a couple reviewing their family budget on a tablet in a cosy living room, bright airy room',
    'Twitter/X Card (2:1)': 'horizontal composition of a personal-finance dashboard on a phone with goal progress, bold clean design, navy and white finance tones, professional photography',
    'LinkedIn Banner (4:1)': 'ultra-wide professional banner, subtle gradient navy to white, finance dashboard silhouette, clean corporate fintech aesthetic',
    'Pinterest Pin (2:3)': 'tall vertical pin, monthly budgeting steps infographic, clean icons, numbered, navy and white',
    'YouTube Thumbnail (16:9)': 'bold YouTube thumbnail composition, high contrast, surprised member looking at savings milestone on phone, expressive cinematic scene',
    'Facebook Cover (2.7:1)': 'wide Facebook cover, gradient background, family-finance USP illustration, professional brand visual',
    'WhatsApp Status (9:16)': 'vertical WhatsApp status card, friendly money-coach avatar, minimal clean design, finance navy accent',
  };

  const styleMap: Record<typeof VISUAL_STYLES[number], string> = {
    Photorealistic: 'photorealistic DSLR photo quality, natural lighting, shallow depth of field, hyper-detailed, 8K resolution',
    'Flat Illustration': 'flat vector illustration, clean lines, geometric shapes, pastel palette, minimal shadows, modern design',
    Minimalist: 'minimalist design, lots of white space, single focal point, muted tones, clean and simple',
    'Bold & Typographic': 'bold graphic design poster style, high contrast colours, strong visual hierarchy, dynamic composition',
    Cinematic: 'cinematic photography, dramatic lighting, movie-still quality, colour graded, wide angle lens',
    Watercolour: 'watercolour painting, soft brush strokes, artistic, dreamy, paper texture, flowing colours',
    'Neon / Dark Mode': 'neon colours, dark background, glowing effects, high contrast, modern digital aesthetic',
  };

  return `${customSubject?.trim() ? customSubject.trim() : conceptMap[format]}, ${styleMap[style]}, finance navy #0F2A5F accent, professional`;
}

function buildPostImagePrompt(platform: string, pillar: string): string {
  const pillarImages: Record<string, string> = {
    'Education & Awareness': 'educational personal-finance scene, money coach explaining a budget on a tablet to a young couple in a bright home, warm and informative, clear and professional',
    'Trust & Social Proof': 'happy member giving thumbs up after hitting a savings milestone on phone, warm genuine moment, bright home environment, trustworthy finance scene',
    'Product/Service Highlight': 'member using personal-finance app on smartphone showing a goal at 60%, modern fintech, clean professional scene',
    'Brand Story': 'heartfelt moment between adult child helping elderly parent set up their first budget on phone, warm emotional lighting, storytelling photography',
    'Community & Engagement': 'diverse group of happy urban Indian people in a money-talk meetup, community personal-finance, vibrant energetic social visual',
    'Offer & Promotion': 'vibrant promotional personal-finance visual, family budgeting on phone with discount tag, energetic call-to-action composition, bold brand colours',
  };

  const platformStyle: Record<string, string> = {
    Instagram: 'Instagram square 1:1 format, high-quality lifestyle photography, warm saturated tones',
    LinkedIn: 'LinkedIn professional landscape format, clean corporate aesthetic, navy and white tones',
    'Twitter/X': 'Twitter card 2:1 horizontal, bold punchy design, high contrast',
    Facebook: 'Facebook post format, engaging lifestyle image, approachable and warm',
    WhatsApp: 'simple clean square image, minimal design, clear and direct, professional',
  };

  return `${pillarImages[pillar] ?? 'professional personal-finance social media post, your brand family-finance app'}, ${platformStyle[platform] ?? 'social media post format'}, finance navy accent, premium brand quality`;
}

// ─── Generators ───────────────────────────────────────────────────────────────

function generatePost(platform: string, pillar: string, tone: string): string {
  const toneMap: Record<string, string> = {
    Professional: 'polished, authoritative tone with clear value propositions',
    Conversational: 'friendly, warm tone as if speaking directly to the reader',
    Inspirational: 'uplifting tone with motivational language and positive outcomes',
    Witty: 'clever, light-hearted tone with a touch of humour',
    Empathetic: 'understanding, compassionate tone addressing real pain points',
    Bold: 'direct, confident tone with strong calls to action',
  };

  const platformConfigs: Record<string, { maxChars: string; format: string; hashtagCount: number }> = {
    Instagram: { maxChars: '2,200 characters', format: 'hook + body + CTA + hashtags (up to 30)', hashtagCount: 15 },
    LinkedIn: { maxChars: '3,000 characters', format: 'hook (2 lines before "see more") + insight + CTA + 3–5 hashtags', hashtagCount: 4 },
    'Twitter/X': { maxChars: '280 characters per tweet; use a thread of 5 tweets for longer content', format: 'punchy hook tweet → thread expanding the idea', hashtagCount: 2 },
    Facebook: { maxChars: '63,206 characters (keep to ~200 for best reach)', format: 'story-driven post + question to drive comments', hashtagCount: 3 },
    WhatsApp: { maxChars: '4,096 characters', format: 'short message, personalised greeting, clear offer, WhatsApp-safe emojis (no links, bold via *text*)', hashtagCount: 0 },
  };

  const cfg = platformConfigs[platform] ?? { maxChars: '500 characters', format: 'post + CTA', hashtagCount: 5 };

  const pillarContent: Record<string, { hook: string; body: string; cta: string }> = {
    'Education & Awareness': {
      hook: platform === 'Twitter/X' ? `🧵 Most people don't know this about budgeting and SIPs in India — thread 👇` : `Did you know? You can set up a household budget and start a SIP in under 2 minutes.`,
      body: `At your brand, we're changing what personal finance looks like.\n\nNo spreadsheets. No jargon. Just clear plans, real progress, and money goals you actually hit.\n\n✅ 12,000+ active members\n✅ Bank-grade security\n✅ Transparent pricing\n✅ Available across India`,
      cta: platform === 'WhatsApp' ? `Set up your first budget → example.com` : `👉 Start your free budget today: example.com`,
    },
    'Trust & Social Proof': {
      hook: platform === 'Twitter/X' ? `⭐ 4.8 stars. 12,000+ members. Here's what they say about your brand 👇` : `4.8 ⭐ from 12,000+ members — here's why your brand is India's most trusted family-finance app.`,
      body: `"I set up my budget in 5 minutes. 6 months later I've saved ₹62,000 — for the first time in my life." — Priya M., Mumbai\n\nWe built your brand on one principle: money should work for your life, not the other way around.`,
      cta: `Read more member stories at example.com/stories`,
    },
    'Product/Service Highlight': {
      hook: platform === 'Twitter/X' ? `Setting up your first family budget with your brand takes exactly 2 minutes. Let me show you. 🧵` : `Your money, on your schedule. Set up a family budget in 2 minutes.`,
      body: `Here's how it works:\n1️⃣ Open example.com or the app\n2️⃣ Pick a budget template (or build your own)\n3️⃣ Securely link an account or upload a statement\n4️⃣ Get personalised savings suggestions\n5️⃣ Start a SIP or savings goal in one tap\n\nNo more end-of-month panic.`,
      cta: `Try it today → example.com`,
    },
    'Brand Story': {
      hook: platform === 'Twitter/X' ? `We started your brand because our co-founder's family fought about money every single month. 🧵` : `Why we built your brand — a story about a gap in Indian household finance.`,
      body: `Indian families earn well — but most can\u2019t see where the money goes.\n\nOur co-founder watched her parents argue about EMIs and end-of-month spending for years. That experience became your brand.\n\nToday, 12,000+ members use our platform to budget, save and invest as a family. ₹4.2 crore was saved by them last quarter alone.\n\nWe're just getting started.`,
      cta: `Join us → example.com`,
    },
    'Community & Engagement': {
      hook: platform === 'Twitter/X' ? `Quick poll: when an unexpected ₹10,000 expense hits, what do you do first? 👇` : `We want to hear from you 👇`,
      body: `An unexpected ₹10,000 expense lands today — what's your first move?\n\n💳 Put it on a credit card\n🏦 Dip into your emergency fund\n📱 Borrow / buy now pay later\n👨\u200d👩\u200d👧 Talk to family\n\nThere's no wrong answer. But your answer shapes how we build your brand.`,
      cta: `Drop your answer below ⬇️`,
    },
    'Offer & Promotion': {
      hook: platform === 'Twitter/X' ? `🚨 Limited: ₹100 off your first month of your brand premium this week only. 🧵` : `🎉 First month of premium, ₹100 off — this week only.`,
      body: `We want more families to feel in control of their money.\n\nSo for the next 7 days: your first month of your brand premium is ₹100 off.\n\nNo coupon code needed. Discount applies automatically at checkout.\n\n✅ Goal-based investing\n✅ Tax tools\n✅ Family circle for shared budgets`,
      cta: `Claim your discount → example.com/upgrade`,
    },
  };

  const content = pillarContent[pillar] ?? pillarContent['Education & Awareness'];

  const hashtagSets: Record<string, string[]> = {
    Instagram: ['#YourBrand', '#PersonalFinance', '#MoneyTipsIndia', '#FamilyFinance', '#SIPInvesting', '#BudgetingTips', '#SavingsGoal', '#FintechIndia', '#MoneyMatters', '#IndiaFinance', '#FinancialFreedom', '#WealthBuilding', '#MoneyMindset', '#SmartMoney', '#PlanYourMoney'],
    LinkedIn: ['#Fintech', '#PersonalFinanceIndia', '#FinancialWellness', '#YourBrand'],
    'Twitter/X': ['#PersonalFinance', '#SIP'],
    Facebook: ['#FamilyFinance', '#YourBrand', '#MoneyTipsIndia'],
    WhatsApp: [],
  };

  const hashtags = (hashtagSets[platform] ?? []).slice(0, cfg.hashtagCount);

  let output = `**Platform:** ${platform}\n**Pillar:** ${pillar}\n**Tone:** ${tone} — ${toneMap[tone] ?? ''}\n**Format:** ${cfg.format}\n**Max length:** ${cfg.maxChars}\n\n---\n\n`;

  if (platform === 'Twitter/X') {
    output += `**Tweet 1 (hook):**\n${content.hook}\n\n`;
    output += `**Tweet 2:**\n${content.body.split('\n').slice(0, 3).join(' ')}\n\n`;
    output += `**Tweet 3:**\nHere's what makes your brand different: bank-grade security, family circles, and goal-based saving — all in one app.\n\n`;
    output += `**Tweet 4:**\nWe serve members across India today, with deeper city-level features in Mumbai, Delhi, Bengaluru and Hyderabad.\n\n`;
    output += `**Tweet 5 (CTA):**\n${content.cta} ${hashtags.join(' ')}\n`;
  } else if (platform === 'WhatsApp') {
    output += `*Hi [First Name]* 👋\n\n${content.hook}\n\n${content.body}\n\n${content.cta}`;
  } else {
    output += `${content.hook}\n\n${content.body}\n\n${content.cta}`;
    if (hashtags.length > 0) output += `\n\n${hashtags.join(' ')}`;
  }

  return output;
}

function generateVisualPrompt(format: typeof FORMAT_TYPES[number], style: string, tool: string, customSubject?: string): string {
  const dimensions = FORMAT_DIMENSIONS[format];

  const toolGuide: Record<string, string> = {
    'OpenAI dall-e-3':
      'Use descriptive, scene-based prompts. Specify subject, setting, lighting, mood, composition and style. DALL-E 3 follows explicit instructions closely. Avoid watermarks/text overlays in the prompt — add typography in your design tool.',
    'Google Nano Banana':
      'Nano Banana (Gemini 2.5 Flash Image) is fast, free on AI Studio keys, and great at photoreal scenes, faces and hands. Lead with the subject, then setting, then style/lighting. Keep prompts concise and concrete; avoid contradictory style words. Add typography in your design tool, not the prompt.',
  };

  const stylePrompts: Record<string, string> = {
    Photorealistic: 'photorealistic, DSLR photo quality, natural lighting, shallow depth of field, 8K resolution',
    'Flat Illustration': 'flat vector illustration, clean lines, geometric shapes, pastel colour palette, minimal shadows',
    Minimalist: 'minimalist design, lots of white space, single focal point, clean typography, muted tones',
    'Bold & Typographic': 'bold typography, high contrast colours, strong visual hierarchy, graphic design poster style',
    Cinematic: 'cinematic photography, dramatic lighting, movie-still quality, wide angle, colour graded',
    Watercolour: 'watercolour painting, soft brush strokes, artistic, dreamy, paper texture, flowing colours',
    'Neon / Dark Mode': 'neon colours, dark background, glowing effects, cyberpunk-inspired, high contrast',
  };

  const conceptMap: Record<string, string> = {
    'Square Post (1:1)': 'A warm, welcoming scene of a young Indian couple reviewing a personal-finance app together at a bright modern kitchen table. Soft natural light, warm tones, calm and in-control money moment.',
    'Portrait Post (4:5)': 'A close-up portrait of a confident, smiling young Indian professional holding a smartphone showing a clean budget app. Soft bokeh background suggesting a home environment.',
    'Story / Reel (9:16)': 'A full-height mobile-first visual. Top: bold headline text area. Middle: member smiling at a goal-progress screen on a phone, bright daylight, warm colour palette. Bottom: app signup CTA button area.',
    'Landscape Banner (16:9)': 'Wide-angle scene of a couple reviewing their monthly family budget on a tablet in a cosy living room. Bright, airy, finance-navy and white tones.',
    'Twitter/X Card (2:1)': 'A horizontal split design: left side — bold headline "Set Up Your Budget in 2 Min", right side — phone showing a clean monthly budget with a goal at 60%.',
    'LinkedIn Banner (4:1)': 'Ultra-wide professional banner. Subtle gradient from navy to white. your brand\u2019s logo on left, tagline in centre, abstract finance dashboard silhouette on right.',
    'Pinterest Pin (2:3)': 'Tall pin design with a step-by-step "How to set up a monthly family budget" infographic. Clean icons, numbered steps, your brand brand colours.',
    'YouTube Thumbnail (16:9)': 'Bold thumbnail. Large, readable text overlay: "Saved ₹62,000 in 6 MONTHS?!". Surprised-face reaction image on left, phone with goal progress on right. High contrast.',
    'Facebook Cover (2.7:1)': 'Wide cover with gradient background. Left: your brand\u2019s logo + tagline. Centre: key USPs as icons (security, family-circle, goals). Right: family-finance illustration.',
    'WhatsApp Status (9:16)': 'Vertical status card. Top: greeting + brand name. Middle: core message with emoji. Bottom: CTA with link. WhatsApp green accent.',
  };

  const concept = customSubject?.trim()
    ? customSubject.trim()
    : (conceptMap[format] ?? 'A professional personal-finance brand visual for your brand, focusing on family budgeting and goal-based saving.');

  let prompt = `**Format:** ${format}\n**Dimensions:** ${dimensions}\n**Visual Style:** ${style}\n**AI Tool:** ${tool}\n\n`;
  prompt += `---\n\n`;
  prompt += `**Production Prompt:**\n\n`;
  prompt += `${concept}\n\n`;
  prompt += `Style: ${stylePrompts[style] ?? style}.\n\n`;
  prompt += `Brand palette: Finance navy (#0F2A5F), clean white (#FFFFFF), warm grey (#F5F5F5), accent green (#22C55E).\n\n`;
  prompt += `Technical: ${dimensions}, optimised for digital display, no text overlaid (add in design tool).\n\n`;

  prompt += `---\n\n**Tool Guidance:**\n${toolGuide[tool] ?? ''}`;

  return prompt;
}

function generateAdCreative(platform: string, objective: string): string {
  const objectiveMap: Record<string, string> = {
    'Brand Awareness': 'maximise impressions and recall among target audience',
    'Member Acquisition': 'drive first signup completions from high-intent searchers',
    'Subscription Upgrade': 'convert active free members to paid premium subscribers',
    'App Install': 'drive app downloads from relevant audiences',
    'Re-engagement / Retargeting': 're-activate users who visited but did not convert',
    'Seasonal Offer': 'drive urgency and immediate signups with a time-limited offer',
  };

  const platformFormats: Record<string, { headlines: number; descriptions: number; hasCallouts: boolean; hasSitelinks: boolean; hasVisual: boolean }> = {
    'Google Search': { headlines: 15, descriptions: 4, hasCallouts: true, hasSitelinks: true, hasVisual: false },
    'Google Display': { headlines: 5, descriptions: 5, hasCallouts: false, hasSitelinks: false, hasVisual: true },
    'Meta (Facebook/Instagram)': { headlines: 3, descriptions: 3, hasCallouts: false, hasSitelinks: false, hasVisual: true },
    'LinkedIn Ads': { headlines: 3, descriptions: 3, hasCallouts: false, hasSitelinks: false, hasVisual: true },
    'YouTube Ads': { headlines: 3, descriptions: 2, hasCallouts: false, hasSitelinks: false, hasVisual: true },
    'WhatsApp Ads': { headlines: 2, descriptions: 2, hasCallouts: false, hasSitelinks: false, hasVisual: true },
  };

  const cfg = platformFormats[platform] ?? platformFormats['Google Search'];

  const adSets: Record<string, Record<string, { headlines: string[]; descriptions: string[]; callouts: string[]; sitelinks: string[]; visualDirection: string }>> = {
    'Member Acquisition': {
      'Google Search': {
        headlines: ['Set Up a Budget in 2 Min', 'India\u2019s Trusted Money App', 'Plan, Save & Invest — Free', 'Family Budgeting Made Simple', 'Start Your First SIP Today', 'Goal-Based Saving in 2 Min', 'Track Spending Automatically', 'Personal Finance App India', '4.8★ Family-Finance App', 'Sign Up in Under 2 Minutes', 'Bank-Grade Security', 'Free Forever Plan Available', 'Budget · Goals · SIP · Tax', 'your brand — India\'s #1', 'Personal Finance — Start Free'],
        descriptions: ['Plan, save and invest as a household with your brand. Bank-grade security, transparent pricing, available across India. 4.8★ rated by 12,000+ members.', 'Family-friendly budgeting and goal-based saving. Free forever plan, premium from ₹199/month. Set up in 2 minutes. Investments are subject to market risk.', 'Stop end-of-month panic. Build a real plan in 2 minutes. Track every rupee, hit every goal — your brand is the money app you\'ve been waiting for.', 'your brand: India\u2019s most trusted personal-finance app. Bank-grade security, transparent pricing, family circles. First month of premium ₹100 off.'],
        callouts: ['Bank-Grade Security', 'Family Circles', 'Goal-Based Saving', 'Auto SIP Setup', '4.8★ Rated', 'Tax-Saving Tools', 'No Hidden Fees', '12,000+ Members'],
        sitelinks: ['Start Free | example.com/signup', 'How It Works | example.com/how', 'Pricing | example.com/pricing', 'Member Reviews | example.com/reviews', 'SIP Calculator | example.com/sip', 'FAQ | example.com/faq'],
        visualDirection: 'N/A — text-only format',
      },
      'Meta (Facebook/Instagram)': {
        headlines: ['Set Up a Budget in 2 Min', 'Plan Your Money, Hit Goals', 'Family Finance, Made Simple'],
        descriptions: ['Build your first monthly budget in under 2 minutes. Bank-grade security, transparent pricing, family-friendly. Available across India.', '12,000+ members. Goal-based saving and SIPs. 4.8★ rated. Sign up free and get ₹100 off your first month of premium.', 'Your money deserves a real plan. Set up a household budget today — no spreadsheets, no jargon, no end-of-month panic.'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**DALL-E 3 Visual Direction:**\nScene: A young Indian couple at a bright modern kitchen table, smiling and looking at a personal-finance app on a smartphone together.\nStyle: Photorealistic, warm lighting, welcoming. Brand colours: finance navy + clean white.\nDimensions: 1:1 (1080×1080) for feed, 9:16 (1080×1920) for Stories/Reels.\nPrompt: "Photorealistic image of a young Indian couple at a bright modern kitchen table reviewing a personal-finance app on a smartphone, calm in-control money moment, warm natural lighting, navy and white tones, clean and professional, 1080×1080"',
      },
      'LinkedIn Ads': {
        headlines: ['Set Up a Budget in 2 Min', 'Money That Works Around You', 'Family Finance — Start Free'],
        descriptions: ['your brand brings personal-finance planning to your household. Bank-grade security, family circles, goal-based saving. Trusted by 12,000+ members across India.', 'No spreadsheets. No jargon. Set up your first budget in 2 minutes and start a SIP from the same screen.', 'Join 12,000+ members who chose your brand. Free forever plan, premium from ₹199/month. First month ₹100 off.'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**DALL-E 3 Visual Direction:**\nScene: A professional lifestyle setting — a person working from home on a laptop, looking calm and in control, with a finance dashboard visible on a second screen.\nStyle: Clean, professional, LinkedIn aesthetic. Navy tones, bright and airy.\nDimensions: 1.91:1 (1200×628 px) for LinkedIn single image ad.\nPrompt: "Professional lifestyle photo of a person working from home at a desk, finance dashboard visible on a second screen showing goal progress, warm home office setting, navy and white colour palette, clean and trustworthy feel, 1200×628"',
      },
      'Google Display': {
        headlines: ['Personal Finance — Start Free', 'Set Up a Budget in 2 Min', 'India\u2019s Trusted Money App', 'Plan · Save · Invest', '4.8★ Family-Finance App'],
        descriptions: ['12,000+ members. Free forever plan. Set up in 2 minutes.', 'Bank-grade security, transparent pricing, family circles.', 'Available across India. First month of premium ₹100 off.', 'Trusted by 12,000+ members. Sign up for your brand today.', 'Money that works on your schedule — your brand for India.'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**DALL-E 3 Visual Direction:**\nCreate a clean display ad visual: a stylised goal-progress bar or coin icon on a warm gradient background (finance navy to white). Bold headline space at top, CTA button at bottom.\nSizes needed: 300×250 (medium rectangle), 728×90 (leaderboard), 160×600 (wide skyscraper), 320×50 (mobile banner).\nPrompt for hero image: "Clean fintech brand illustration, friendly stylised coin and goal-progress icon on a gradient navy-to-white background, minimal flat design, trustworthy and modern, no text, 300×250"',
      },
      'YouTube Ads': {
        headlines: ['Set Up a Budget in 2 Min', 'Plan Your Money, Hit Goals', 'Skip End-of-Month Panic'],
        descriptions: ['See how your brand helps Indian families budget, save and invest in 2 minutes. Bank-grade security, family circles, goal-based investing.', '12,000+ members. Free forever plan. Available across India. First month of premium ₹100 off.'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**DALL-E 3 Visual Direction:**\nFirst 5 seconds (before skip): High-energy open — close-up of phone screen showing a goal hitting 100%, then cut to family celebrating around the kitchen table.\nHero visual for companion banner: Family-money moment in a warm home setting, your brand branding visible.\nPrompt: "Cinematic close-up of a smartphone screen showing a savings goal at 100% with confetti animation, hands holding phone, excited expression visible, photorealistic, 1280×720"',
      },
      'WhatsApp Ads': {
        headlines: ['Family Finance — Start Free', 'Plan Your Money in 2 Min'],
        descriptions: ['12,000+ members. Free forever plan. Family circles, goal-based saving, SIPs. Sign up in 2 minutes → example.com', 'Stop end-of-month panic. Build a real plan today. Bank-grade security. 4.8★ rated. Start free → example.com/signup'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**DALL-E 3 Visual Direction:**\nSimple, clean WhatsApp-safe image: stylised piggy-bank or goal-progress icon + brand name on a white background with a simple border. Keep it friendly and non-cluttered.\nDimensions: 1:1 (800×800) for WhatsApp image messages.\nPrompt: "Simple clean illustration of a friendly money-coach avatar with your brand branding, white background, finance navy accent, minimal design, WhatsApp-safe image, 800×800"',
      },
    },
    'Subscription Upgrade': {
      'Google Search': {
        headlines: ['Upgrade to your brand Premium', 'Premium Family Finance — Try', 'Tax-Saving + SIP Tools', 'Goal-Based Investing — Premium', 'Family Circle — Premium Only', 'Premium for Serious Savers', '7-Day Money-Back Premium', 'Premium From ₹199/Month', 'Unlock Premium Insights', 'Annual Plan — 2 Months Free', 'Premium Tax Filing Tools', 'Join 3k+ Premium Members', 'Smart Money Tools — Premium', 'your brand Premium — Try', 'Upgrade — First Month ₹100 Off'],
        descriptions: ['Unlock goal-based investing, family circles, and premium tax tools with your brand Premium. From ₹199/month. 7-day money-back, cancel anytime.', 'Premium gives you SIP automation, tax-saving suggestions, and a shared family-finance dashboard. Trusted by 3,000+ paying members across India.', 'Ready for the next step? your brand Premium turns budgeting into goal-based investing — with bank-grade security and family-friendly tools.', 'First month of your brand Premium is ₹100 off. Annual plan saves you 2 months. Cancel anytime — no questions asked.'],
        callouts: ['7-Day Money-Back', 'Cancel Anytime', 'SIP Automation', 'Tax-Saving Tools', 'Family Circle', 'Annual Saves 2 Months', 'No Hidden Fees', '3k+ Premium Members'],
        sitelinks: ['Compare Plans | example.com/pricing', 'Premium Features | example.com/premium', 'SIP Calculator | example.com/sip', 'Tax Tools | example.com/tax', 'Member Reviews | example.com/reviews', 'FAQ | example.com/faq'],
        visualDirection: 'N/A — text-only format',
      },
      'LinkedIn Ads': {
        headlines: ['Upgrade to your brand Premium', 'Goal-Based Investing — Premium', 'Premium for Serious Savers'],
        descriptions: ['Unlock SIP automation, family circles, and premium tax tools. Trusted by 3,000+ paying members across India. From ₹199/month, cancel anytime.', 'Join 3,000+ paying members who upgraded to Premium. Average premium member tracks 3+ goals and saves 2.4× more than free users.', 'Stop guessing. your brand Premium turns budgeting into goal-based investing — with personalised tax suggestions for your income band.'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**DALL-E 3 Visual Direction:**\nScene: A confident, professional person reviewing a clean premium dashboard on a tablet. Calm, in-control vibe. Bright modern home office.\nStyle: Professional LinkedIn aesthetic, navy tones.\nDimensions: 1200×628 px.\nPrompt: "Confident young Indian professional reviewing a clean premium personal-finance dashboard on a tablet with goal progress and SIP cards, bright modern home office, professional and trustworthy, navy and white colour palette, 1200×628"',
      },
      'Meta (Facebook/Instagram)': {
        headlines: ['Upgrade to your brand Premium', 'Premium Members Save 2.4× More', 'Goal-Based Investing in 1 Tap'],
        descriptions: ['Unlock SIP automation, family circles, and premium tax tools. From ₹199/month. 7-day money-back, cancel anytime.', 'Tired of saving "in general"? Premium turns vague intent into named goals with auto-debit. Join 3,000+ paying members.', 'Build real wealth without spreadsheets. your brand Premium handles the heavy lifting — you just live your life.'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**DALL-E 3 Visual Direction:**\nScene: A person looking at their phone and smiling, with a notification visible showing "Goal hit · ₹50,000 saved". Split with brand colours.\nDimensions: 1:1 (1080×1080) for feed, 9:16 (1080×1920) for Stories.\nPrompt: "Indian professional happily looking at smartphone notification showing a savings-goal milestone hit, bright clean background, finance navy accents, professional and approachable, 1080×1080"',
      },
      'Google Display': {
        headlines: ['Upgrade to Premium', 'Premium From ₹199/Month', 'SIP + Tax + Family Circle', '7-Day Money-Back', 'Premium Members Save More'],
        descriptions: ['Unlock SIP automation, tax tools and family circles. Cancel anytime.', 'your brand Premium — built for serious savers and families.', '3,000+ paying members. From ₹199/month. Try risk-free.', 'Annual plan saves you 2 months. First month ₹100 off.', 'Premium Member Insights — your wealth, on your schedule.'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**DALL-E 3 Visual Direction:**\nClean display banner: stylised goal-progress + premium-badge graphic + brand colours.\nPrompt: "Minimalist display ad visual, friendly goal-progress icon with a small premium badge, finance navy gradient, clean and professional, no text, 300×250"',
      },
      'YouTube Ads': {
        headlines: ['Upgrade to your brand Premium', 'Premium Members Save 2.4× More', 'Goal-Based Investing in 1 Tap'],
        descriptions: ['See how your brand Premium helps Indian families budget, save and invest with SIPs, tax tools and family circles. From ₹199/month, cancel anytime.', 'Join 3,000+ paying members. Average premium member tracks 3+ goals. First month ₹100 off.'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**DALL-E 3 Visual Direction:**\nFirst 5 seconds: Phone showing "Goal hit · ₹50,000" notification, then testimonial-style "I saved 2× more after upgrading to Premium."\nPrompt: "Cinematic close-up of a phone showing a savings-goal milestone hit notification, hand visible, warm lighting, professional setting, 1280×720"',
      },
      'WhatsApp Ads': {
        headlines: ['Upgrade to Premium Today', 'Premium From ₹199/Month'],
        descriptions: ['Unlock SIP automation, tax tools and family circles. From ₹199/month. 7-day money-back. Try: example.com/upgrade', 'Premium members save 2.4× more on average. First month ₹100 off → example.com/upgrade'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**DALL-E 3 Visual Direction:**\nSimple image: goal-progress icon with a small premium badge + "Try Premium" CTA. Clean, WhatsApp-safe.\nPrompt: "Simple clean illustration of a goal-progress meter with a small premium badge, your brand\u2019s logo area, white background, navy accents, friendly and professional, 800×800"',
      },
    },
  };

  // Default to Member Acquisition if the specific objective/platform combo isn't defined
  const objectiveKey = objective === 'Subscription Upgrade' ? 'Subscription Upgrade' : 'Member Acquisition';
  const platformData = adSets[objectiveKey]?.[platform] ?? adSets['Member Acquisition']['Google Search'];

  let output = `**Platform:** ${platform}\n**Campaign Objective:** ${objective} — ${objectiveMap[objective] ?? ''}\n\n---\n\n`;

  const headlines = platformData.headlines.slice(0, cfg.headlines);
  output += `**Headlines (${headlines.length}):**\n`;
  headlines.forEach((h, i) => { output += `${i + 1}. ${h}\n`; });

  output += `\n**Descriptions (${Math.min(platformData.descriptions.length, cfg.descriptions)}):**\n`;
  platformData.descriptions.slice(0, cfg.descriptions).forEach((d, i) => { output += `${i + 1}. ${d}\n`; });

  if (cfg.hasCallouts && platformData.callouts.length > 0) {
    output += `\n**Callout Extensions:**\n${platformData.callouts.map((c) => `• ${c}`).join('\n')}\n`;
  }

  if (cfg.hasSitelinks && platformData.sitelinks.length > 0) {
    output += `\n**Sitelink Extensions:**\n${platformData.sitelinks.map((s) => `• ${s}`).join('\n')}\n`;
  }

  if (cfg.hasVisual && platformData.visualDirection) {
    output += `\n${platformData.visualDirection}\n`;
  }

  return output;
}

// ─── Tab Components ────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-primary hover:text-primary transition flex items-center gap-1.5"
    >
      {copied ? '✅ Copied!' : '📋 Copy'}
    </button>
  );
}

function OutputBox({ content }: { content: string }) {
  return (
    <div className="relative bg-gray-50 border border-gray-200 rounded-xl p-5 mt-4">
      <div className="absolute top-3 right-3">
        <CopyButton text={content} />
      </div>
      <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-sans pr-20">{content}</pre>
    </div>
  );
}

function PostGeneratorTab() {
  const [platform, setPlatform] = useState<typeof PLATFORMS_POST[number]>('Instagram');
  const [pillar, setPillar] = useState<typeof CONTENT_PILLARS[number]>('Education & Awareness');
  const [tone, setTone] = useState<typeof TONES[number]>('Professional');
  const [output, setOutput] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');

  function generate() {
    setOutput(generatePost(platform, pillar, tone));
    setImagePrompt(buildPostImagePrompt(platform, pillar));
  }

  const pixels = POST_PLATFORM_PIXELS[platform] ?? { w: 1024, h: 1024 };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Platform</label>
          <div className="flex flex-col gap-1.5">
            {PLATFORMS_POST.map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`text-sm px-3 py-2 rounded-lg border text-left transition ${
                  platform === p ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-700 hover:border-primary hover:text-primary'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Content Pillar</label>
          <div className="flex flex-col gap-1.5">
            {CONTENT_PILLARS.map((pl) => (
              <button
                key={pl}
                onClick={() => setPillar(pl)}
                className={`text-sm px-3 py-2 rounded-lg border text-left transition ${
                  pillar === pl ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-700 hover:border-primary hover:text-primary'
                }`}
              >
                {pl}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tone</label>
          <div className="flex flex-col gap-1.5">
            {TONES.map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`text-sm px-3 py-2 rounded-lg border text-left transition ${
                  tone === t ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-700 hover:border-primary hover:text-primary'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={generate}
        className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-dark transition"
      >
        ✨ Generate Post
      </button>

      {imagePrompt && (
        <GeneratedImage prompt={imagePrompt} width={pixels.w} height={pixels.h} label={`${platform} Visual — ${pillar}`} />
      )}
      {output && <OutputBox content={output} />}
    </div>
  );
}

function VisualGeneratorTab() {
  const [format, setFormat] = useState<typeof FORMAT_TYPES[number]>('Square Post (1:1)');
  const [style, setStyle] = useState<typeof VISUAL_STYLES[number]>('Photorealistic');
  const [tool, setTool] = useState<typeof AI_TOOLS[number]>('OpenAI dall-e-3');
  const [customSubject, setCustomSubject] = useState('');
  const [output, setOutput] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');

  function generate() {
    setOutput(generateVisualPrompt(format, style, tool, customSubject));
    setImagePrompt(buildImagePromptForVisual(format, style, customSubject));
  }

  const pixels = FORMAT_PIXELS[format];

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="visual-subject" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Describe Your Image <span className="text-gray-400 normal-case font-normal">(optional — leave blank to use the default brand scene for the selected format)</span>
        </label>
        <textarea
          id="visual-subject"
          value={customSubject}
          onChange={(e) => setCustomSubject(e.target.value)}
          rows={3}
          placeholder="e.g. A young Indian couple at a sunlit kitchen table reviewing a personal-finance app on a phone, calm and in-control money moment"
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-y"
        />
        <p className="mt-1 text-xs text-gray-500">
          Tip: be specific about subject, setting, mood and any props. The selected Visual Style and Format dimensions are added automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Format</label>
          <div className="flex flex-col gap-1.5">
            {FORMAT_TYPES.map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`text-sm px-3 py-2 rounded-lg border text-left transition ${
                  format === f ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-700 hover:border-primary hover:text-primary'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Visual Style</label>
          <div className="flex flex-col gap-1.5">
            {VISUAL_STYLES.map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={`text-sm px-3 py-2 rounded-lg border text-left transition ${
                  style === s ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-700 hover:border-primary hover:text-primary'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">AI Tool</label>
          <div className="flex flex-col gap-1.5">
            {AI_TOOLS.map((t) => (
              <button
                key={t}
                onClick={() => setTool(t)}
                className={`text-sm px-3 py-2 rounded-lg border text-left transition ${
                  tool === t ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-700 hover:border-primary hover:text-primary'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={generate}
        className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-dark transition"
      >
        🎨 Generate Visual
      </button>

      {imagePrompt && (
        <GeneratedImage
          prompt={imagePrompt}
          width={pixels.w}
          height={pixels.h}
          label={`${format} — ${style}`}
          provider={TOOL_TO_PROVIDER[tool]}
        />
      )}
      {output && <OutputBox content={output} />}
    </div>
  );
}

function AdCreativeGeneratorTab() {
  const [adPlatform, setAdPlatform] = useState<typeof AD_PLATFORMS[number]>('Google Search');
  const [objective, setObjective] = useState<typeof CAMPAIGN_OBJECTIVES[number]>('Member Acquisition');
  const [output, setOutput] = useState('');

  function generate() {
    setOutput(generateAdCreative(adPlatform, objective));
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ad Platform</label>
          <div className="flex flex-col gap-1.5">
            {AD_PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => setAdPlatform(p)}
                className={`text-sm px-3 py-2 rounded-lg border text-left transition ${
                  adPlatform === p ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-700 hover:border-primary hover:text-primary'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Campaign Objective</label>
          <div className="flex flex-col gap-1.5">
            {CAMPAIGN_OBJECTIVES.map((o) => (
              <button
                key={o}
                onClick={() => setObjective(o)}
                className={`text-sm px-3 py-2 rounded-lg border text-left transition ${
                  objective === o ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-700 hover:border-primary hover:text-primary'
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={generate}
        className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-dark transition"
      >
        📣 Generate Ad Creative
      </button>

      {output && <OutputBox content={output} />}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'post', label: '✍️ Post Generator', desc: '5 platforms × 6 pillars × tone + AI visual' },
  { id: 'visual', label: '🎨 Visual Generator', desc: 'Generate actual AI images — 10 formats × 7 styles' },
  { id: 'ad', label: '📣 Ad Creative', desc: '6 platforms × 6 objectives' },
] as const;

export default function CreatePage() {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]['id']>('post');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* AI Skills Banner */}
      <div className="bg-gradient-to-r from-primary/10 to-purple-50 border border-primary/20 rounded-xl px-5 py-3 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">Powered by</span>
        {['OpenAI GPT-4o', 'OpenAI DALL-E 3', 'Google Nano Banana'].map((tool) => (
          <span key={tool} className="text-xs px-2.5 py-1 bg-white border border-gray-200 rounded-full text-gray-700 font-medium shadow-sm">
            {tool}
          </span>
        ))}
        <ImageProviderToggle className="ml-auto" />
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-200">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-4 text-left transition ${
                activeTab === tab.id
                  ? 'bg-primary/5 border-b-2 border-primary'
                  : 'hover:bg-gray-50'
              }`}
            >
              <p className={`text-sm font-semibold ${activeTab === tab.id ? 'text-primary' : 'text-gray-700'}`}>{tab.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{tab.desc}</p>
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'post' && <PostGeneratorTab />}
          {activeTab === 'visual' && <VisualGeneratorTab />}
          {activeTab === 'ad' && <AdCreativeGeneratorTab />}
        </div>
      </div>
    </div>
  );
}

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
  'Customer Acquisition',
  'Partner Recruitment',
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
    'Square Post (1:1)': 'warm, welcoming brand scene featuring a satisfied customer using the product, bright modern environment, premium feel',
    'Portrait Post (4:5)': 'close-up portrait of a confident smiling person, soft bokeh background, premium brand quality',
    'Story / Reel (9:16)': 'full-height vertical social media visual, dynamic lifestyle scene, warm colour palette, mobile-first composition',
    'Landscape Banner (16:9)': 'wide-angle lifestyle scene of a customer enjoying the product, bright airy environment, modern aesthetic',
    'Twitter/X Card (2:1)': 'horizontal composition with bold clean design, premium brand tones, professional photography',
    'LinkedIn Banner (4:1)': 'ultra-wide professional banner, subtle gradient navy to white, clean corporate aesthetic',
    'Pinterest Pin (2:3)': 'tall vertical pin, step-by-step infographic, clean icons, numbered, brand colour palette',
    'YouTube Thumbnail (16:9)': 'bold YouTube thumbnail composition, high contrast, expressive cinematic scene',
    'Facebook Cover (2.7:1)': 'wide Facebook cover, gradient background, brand value-prop illustration, professional brand visual',
    'WhatsApp Status (9:16)': 'vertical WhatsApp status card, friendly avatar, minimal clean design, brand accent',
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

  return `${customSubject?.trim() ? customSubject.trim() : conceptMap[format]}, ${styleMap[style]}, brand accent colour, professional`;
}

function buildPostImagePrompt(platform: string, pillar: string): string {
  const pillarImages: Record<string, string> = {
    'Education & Awareness': 'educational scene, friendly explainer in bright modern setting, warm and informative, clear and professional',
    'Trust & Social Proof': 'happy customer giving thumbs up after using the product, warm genuine moment, bright environment, trustworthy scene',
    'Product/Service Highlight': 'person using a smartphone app, modern technology in everyday life, clean professional scene',
    'Brand Story': 'heartfelt moment between two people, warm emotional lighting, storytelling photography',
    'Community & Engagement': 'diverse group of happy people, community vibe, vibrant energetic social visual',
    'Offer & Promotion': 'vibrant promotional brand visual, energetic call-to-action composition, bold brand colours',
  };

  const platformStyle: Record<string, string> = {
    Instagram: 'Instagram square 1:1 format, high-quality lifestyle photography, warm saturated tones',
    LinkedIn: 'LinkedIn professional landscape format, clean corporate aesthetic, blue and white tones',
    'Twitter/X': 'Twitter card 2:1 horizontal, bold punchy design, high contrast',
    Facebook: 'Facebook post format, engaging lifestyle image, approachable and warm',
    WhatsApp: 'simple clean square image, minimal design, clear and direct, professional',
  };

  return `${pillarImages[pillar] ?? 'professional brand social media post'}, ${platformStyle[platform] ?? 'social media post format'}, brand accent colour, premium brand quality`;
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
      hook: platform === 'Twitter/X' ? `🧵 Most people don't know this about our category — thread 👇` : `Did you know? Getting started with us takes under 2 minutes.`,
      body: `At our brand, we're changing how this works.\n\nNo friction. No wasted time. Just a verified experience, on demand.\n\n✅ Verified partners\n✅ Real-time updates\n✅ Transparent pricing\n✅ Available in your region`,
      cta: platform === 'WhatsApp' ? `Get started → example.com` : `👉 Get started today: example.com`,
    },
    'Trust & Social Proof': {
      hook: platform === 'Twitter/X' ? `⭐ 4.8 stars. 2,400+ happy customers. Here's what they say 👇` : `4.8 ⭐ from 2,400+ customers — here's why people trust our brand.`,
      body: `"Everything was handled in under 25 minutes. Smooth, kind, and the follow-up was exactly what I needed." — Priya M.\n\nWe built this on one principle: it should work around your life, not the other way around.`,
      cta: `Read more customer stories at example.com/stories`,
    },
    'Product/Service Highlight': {
      hook: platform === 'Twitter/X' ? `Getting started with our brand takes exactly 2 minutes. Let me show you. 🧵` : `On your schedule. Get started in 2 minutes.`,
      body: `Here's how it works:\n1️⃣ Open example.com or the app\n2️⃣ Choose what you need\n3️⃣ Pick a time slot\n4️⃣ Track progress in real time\n5️⃣ Get a digital summary + follow-up plan\n\nNo more wasted afternoons.`,
      cta: `Try it today → example.com`,
    },
    'Brand Story': {
      hook: platform === 'Twitter/X' ? `We started this brand because our co-founder couldn't find a reliable option when she needed one most. 🧵` : `Why we built this — a story about a gap in the market.`,
      body: `The category is full of options — but reliable access is broken.\n\nOur co-founder spent 4 hours on what should have been a 20-minute task. That experience became this brand.\n\nToday, hundreds of partners use our platform to serve customers better. Thousands of customers trusted us last month alone.\n\nWe're just getting started.`,
      cta: `Join us → example.com`,
    },
    'Community & Engagement': {
      hook: platform === 'Twitter/X' ? `Quick poll: when you need help with this, what do you do first? 👇` : `We want to hear from you 👇`,
      body: `When you need help with this — what's your first move?\n\n🏢 Visit a physical location\n📱 Search online\n🤙 Call a friend / family member\n🏠 Open our app\n\nThere's no wrong answer. But we're curious because your answer shapes how we build this product.`,
      cta: `Drop your answer below ⬇️`,
    },
    'Offer & Promotion': {
      hook: platform === 'Twitter/X' ? `🚨 Limited: 10% off your first order this week only. 🧵` : `🎉 First order, 10% off — this week only.`,
      body: `We want more people to experience what real convenience feels like.\n\nSo for the next 7 days: your first order is 10% off.\n\nNo coupon code needed. Discount applies automatically at checkout.\n\n✅ Verified partners\n✅ Same-day availability\n✅ Transparent pricing`,
      cta: `Claim your discount → example.com`,
    },
  };

  const content = pillarContent[pillar] ?? pillarContent['Education & Awareness'];

  const hashtagSets: Record<string, string[]> = {
    Instagram: ['#YourBrand', '#OnDemand', '#GetStarted', '#CustomerFirst', '#Reliable', '#Trusted', '#Modern', '#Lifestyle', '#NewWay', '#Verified', '#PremiumService', '#Community', '#Wellbeing', '#Innovation', '#YourExperience'],
    LinkedIn: ['#Innovation', '#StartupIndia', '#CustomerExperience', '#YourBrand'],
    'Twitter/X': ['#Innovation', '#OnDemand'],
    Facebook: ['#OnDemand', '#YourBrand', '#GetStarted'],
    WhatsApp: [],
  };

  const hashtags = (hashtagSets[platform] ?? []).slice(0, cfg.hashtagCount);

  let output = `**Platform:** ${platform}\n**Pillar:** ${pillar}\n**Tone:** ${tone} — ${toneMap[tone] ?? ''}\n**Format:** ${cfg.format}\n**Max length:** ${cfg.maxChars}\n\n---\n\n`;

  if (platform === 'Twitter/X') {
    output += `**Tweet 1 (hook):**\n${content.hook}\n\n`;
    output += `**Tweet 2:**\n${content.body.split('\n').slice(0, 3).join(' ')}\n\n`;
    output += `**Tweet 3:**\nHere's what makes our brand different: verified partners, real-time updates, transparent pricing — all from one app.\n\n`;
    output += `**Tweet 4:**\nWe serve our priority markets today. More expansion coming this quarter.\n\n`;
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
    'Square Post (1:1)': 'A warm, welcoming brand scene featuring a satisfied customer using the product. Bright modern environment, premium feel.',
    'Portrait Post (4:5)': 'A close-up portrait of a confident, smiling person, soft bokeh background, premium brand quality.',
    'Story / Reel (9:16)': 'A full-height mobile-first visual. Top: bold headline text area. Middle: lifestyle scene, bright daylight, warm colour palette. Bottom: app CTA button area.',
    'Landscape Banner (16:9)': 'Wide-angle lifestyle scene of a customer enjoying the product or service. Bright, airy environment, brand colour palette.',
    'Twitter/X Card (2:1)': 'A horizontal split design: left side — bold headline, right side — product visual or icon with a warm background.',
    'LinkedIn Banner (4:1)': 'Ultra-wide professional banner. Subtle gradient from navy to white. Brand logo on left, tagline in centre, product/illustration on right.',
    'Pinterest Pin (2:3)': 'Tall pin design with a step-by-step "How to get started" infographic. Clean icons, numbered steps, brand colour palette.',
    'YouTube Thumbnail (16:9)': 'Bold thumbnail. Large, readable text overlay with a high-contrast brand colour. Expressive scene that earns the click.',
    'Facebook Cover (2.7:1)': 'Wide cover with gradient background. Left: brand logo + tagline. Centre: key value props as icons. Right: product illustration.',
    'WhatsApp Status (9:16)': 'Vertical status card. Top: greeting + brand name. Middle: core message with emoji. Bottom: CTA with phone number or link. WhatsApp green accent.',
  };

  const concept = customSubject?.trim()
    ? customSubject.trim()
    : (conceptMap[format] ?? 'A professional brand visual focused on the brand\'s core value proposition.');

  let prompt = `**Format:** ${format}\n**Dimensions:** ${dimensions}\n**Visual Style:** ${style}\n**AI Tool:** ${tool}\n\n`;
  prompt += `---\n\n`;
  prompt += `**Production Prompt:**\n\n`;
  prompt += `${concept}\n\n`;
  prompt += `Style: ${stylePrompts[style] ?? style}.\n\n`;
  prompt += `Brand palette: Primary brand colour, clean white (#FFFFFF), warm grey (#F5F5F5), accent (e.g. #22C55E).\n\n`;
  prompt += `Technical: ${dimensions}, optimised for digital display, no text overlaid (add in design tool).\n\n`;

  prompt += `---\n\n**Tool Guidance:**\n${toolGuide[tool] ?? ''}`;

  return prompt;
}

function generateAdCreative(platform: string, objective: string): string {
  const objectiveMap: Record<string, string> = {
    'Brand Awareness': 'maximise impressions and recall among target audience',
    'Customer Acquisition': 'drive first signups / transactions from high-intent searchers',
    'Partner Recruitment': 'attract verified partners to join the platform',
    'App Install': 'drive app downloads from relevant audiences',
    'Re-engagement / Retargeting': 're-activate users who visited but did not convert',
    'Seasonal Offer': 'drive urgency and immediate purchases with a time-limited offer',
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
    'Customer Acquisition': {
      'Google Search': {
        headlines: ['Get Started in 2 Minutes', 'Verified Partners Near You', 'Skip the Queue — Sign Up Now', 'Trusted by 2,400+ Customers', 'Start Today — Risk Free', 'Set Up in Under 2 Min', 'Same-Day Service Available', 'Online Signup — Easy', '4.8★ Rated App', 'Sign Up in Under 2 Minutes', 'Real-Time Updates', 'Plans From a Low Monthly Fee', 'All-In-One Platform', 'Our Brand — Top Rated', 'Get Started — Sign Up Now'],
        descriptions: ['Trusted partners in your city. Sign up in 2 minutes, real-time updates, transparent pricing. 4.8★ rated by 2,400+ customers.', 'Service by verified partners. Same-day availability. No hidden steps. Get a digital receipt + follow-up plan. Sign up online in minutes.', 'Skip the friction. Hundreds of verified partners available. Sign up now and track progress in real time — like a modern marketplace.', 'Our brand: a trusted modern platform. Verified partners, transparent pricing, real-time updates. First order 10% off.'],
        callouts: ['Same-Day Service', 'Verified Partners', 'Real-Time Updates', 'Transparent Pricing', '4.8★ Rated', 'Digital Receipts', 'No Hidden Fees', '150+ Partners'],
        sitelinks: ['Get Started | example.com/start', 'How It Works | example.com/how', 'Our Partners | example.com/partners', 'Pricing | example.com/pricing', 'Customer Reviews | example.com/reviews', 'FAQ | example.com/faq'],
        visualDirection: 'N/A — text-only format',
      },
      'Meta (Facebook/Instagram)': {
        headlines: ['Get Started in 2 Minutes', 'Skip the Friction', 'Verified Partners at Your Service'],
        descriptions: ['Sign up with a verified partner in under 2 minutes. Real-time updates, transparent pricing, digital receipts. Available in your city.', 'Hundreds of verified partners. Same-day availability. 4.8★ from 2,400+ customers. Sign up now and get 10% off your first order.', 'You deserve convenience. Get started today — no friction, no wasted time.'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**Visual Direction:**\nScene: A friendly customer using the product on a smartphone in a bright modern environment, smiling and relaxed.\nStyle: Photorealistic, warm lighting, welcoming. Brand colours.\nDimensions: 1:1 (1080×1080) for feed, 9:16 (1080×1920) for Stories/Reels.\nPrompt: "Photorealistic image of a smiling person using a smartphone in a bright modern environment, warm natural lighting, premium clean setting, 1080×1080"',
      },
      'LinkedIn Ads': {
        headlines: ['Get Started in 2 Minutes', 'A Service That Works Around You', 'Verified Partners — Sign Up Now'],
        descriptions: ['Our brand connects you with verified partners. Same-day availability, real-time updates, transparent pricing. Trusted by 1,240 customers last month.', 'No friction. No wasted time. Sign up in 2 minutes and get a digital receipt within the hour.', 'Join 1,240+ customers who chose our brand. Hundreds of verified partners available. First order 10% off.'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**Visual Direction:**\nScene: A professional working from home on a laptop, looking pleased, with a delivery / completed task visible nearby.\nStyle: Clean, professional, LinkedIn aesthetic. Blue tones, bright and airy.\nDimensions: 1.91:1 (1200×628 px) for LinkedIn single image ad.\nPrompt: "Professional lifestyle photo of a person working from home at a desk, delivery / outcome visible, warm home office setting, blue and white colour palette, clean and trustworthy feel, 1200×628"',
      },
      'Google Display': {
        headlines: ['Get Started — Sign Up Now', 'Verified Partner Network', '2-Min Online Signup', 'Skip the Friction', '4.8★ Rated App'],
        descriptions: ['Hundreds of verified partners. Same-day service. Sign up in 2 minutes.', 'Transparent pricing, real-time updates, digital receipts.', 'Available in your city. First order 10% off.', 'Trusted by 2,400+ customers. Sign up today.', 'A service on your schedule — verified partners on demand.'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**Visual Direction:**\nClean display ad visual: brand icon on warm gradient background. Bold headline space at top, CTA button at bottom.\nSizes needed: 300×250, 728×90, 160×600, 320×50.\nPrompt for hero image: "Clean brand illustration, friendly icon on a gradient background, minimal flat design, trustworthy and modern, no text, 300×250"',
      },
      'YouTube Ads': {
        headlines: ['Get Started in 2 Minutes', 'Verified Partners on Demand', 'Skip the Friction — Sign Up'],
        descriptions: ['See how our brand connects you with verified partners in minutes. Real-time updates, transparent pricing, digital receipts.', 'Hundreds of verified partners. Same-day availability. Sign up in 2 minutes. Available in your city.'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**Visual Direction:**\nFirst 5 seconds (before skip): High-energy open — close-up of phone screen showing signup confirmation, then cut to the customer using the product.\nHero visual for companion banner: Customer / partner interaction, warm setting, brand visible.\nPrompt: "Cinematic close-up of a smartphone screen showing a signup confirmation, bright screen, hands holding phone, excited expression visible, photorealistic, 1280×720"',
      },
      'WhatsApp Ads': {
        headlines: ['Sign Up Now — Get Started', 'Verified Partners on Demand'],
        descriptions: ['Hundreds of verified partners. Same-day service in your city. Sign up in 2 minutes → example.com', 'Skip the friction. Get started today. Transparent pricing. 4.8★ rated. Sign up now → example.com/start'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**Visual Direction:**\nSimple, clean WhatsApp-safe image: brand icon + name on a white background with a simple border. Keep it friendly and non-cluttered.\nDimensions: 1:1 (800×800).\nPrompt: "Simple clean illustration of a friendly brand avatar, white background, brand accent colour, minimal design, WhatsApp-safe image, 800×800"',
      },
    },
    'Partner Recruitment': {
      'Google Search': {
        headlines: ['Join Our Brand as a Partner', 'Grow Your Business — Apply Now', 'Verified Partners Wanted', '40+ Orders/Month Possible', 'Partner Earnings — No Lock-In', 'Independent Operators — Join Us', 'Business Growth Tool', 'Earn More as a Partner', 'Partner Registration — Free', 'Build Your Customer Base Fast', 'Flexible Partner Schedule', 'Join 150+ Partners', 'A Modern Partner Platform', 'On-Demand Partner Network', 'Grow With Our Brand'],
        descriptions: ['Our brand connects verified independent partners with customers who need on-demand service. 40+ orders/month possible. Zero upfront cost, no lock-in. Apply today.', 'Independent operators in your city — grow your business with our brand. We handle bookings, payments, and marketing. You focus on the work.', 'Join 150+ verified partners on our platform. Set your own hours, choose your category. Payment processed automatically. No upfront fee.', 'Stop chasing customers. Our brand brings orders to you. Same-day scheduling, transparent earnings, real-time navigation. Apply as a verified partner today.'],
        callouts: ['Zero Upfront Cost', 'Set Your Own Hours', 'Instant Payments', '40+ Orders Possible', 'No Lock-In Contract', 'Free to Join', '150+ Active Partners'],
        sitelinks: ['Apply Now | example.com/partners/apply', 'How Earnings Work | example.com/partners/earnings', 'Partner FAQ | example.com/partners/faq', 'Success Stories | example.com/partners/stories'],
        visualDirection: 'N/A — text-only format',
      },
      'LinkedIn Ads': {
        headlines: ['Independent Operators — Join Our Brand', 'Grow Your Business With Us', '40+ Orders/Month on Our Platform'],
        descriptions: ['Independent operators in your city — our brand brings orders directly to you. Zero upfront cost, flexible schedule, instant payments.', 'Join 150+ verified partners who use our brand to grow their business. Average 40+ orders/month. No lock-in. Apply in 5 minutes.', 'Stop spending time and money on marketing. Our brand fills your schedule with verified orders. You focus on the work — we handle the rest.'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**Visual Direction:**\nScene: A confident professional reviewing orders on a smartphone. Clean home office background. Successful, empowered professional vibe.\nStyle: Professional LinkedIn aesthetic, blue tones.\nDimensions: 1200×628 px.\nPrompt: "Confident professional checking a smartphone with a satisfied expression, bright modern setting, professional and trustworthy, blue and white colour palette, 1200×628"',
      },
      'Meta (Facebook/Instagram)': {
        headlines: ['Partners: Grow Your Business', 'Join 150+ Verified Partners', '40+ Orders — Zero Marketing'],
        descriptions: ['Independent operators in your city — our brand fills your schedule. Zero upfront cost, no lock-in. Apply today.', 'Tired of empty slots? Our brand brings customers to you. 150+ partners trust us. 40+ orders/month average. Free to join.', 'Build your customer base without spending on marketing. Our brand handles discovery, booking, and payment. You just deliver.'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**Visual Direction:**\nScene: A partner looking at their phone and smiling, with a notification visible showing "New order confirmed". Split with brand colours.\nDimensions: 1:1 (1080×1080) for feed, 9:16 (1080×1920) for Stories.\nPrompt: "Professional happily looking at smartphone notification, bright clean background, brand accent colour, professional and approachable, 1080×1080"',
      },
      'Google Display': {
        headlines: ['Partners — Join Our Brand', 'Grow Your Business With Us', '40+ Monthly Orders', 'Zero-Cost Partner Platform', 'Apply as a Partner'],
        descriptions: ['Join 150+ partners. Zero upfront cost, flexible hours, instant payments.', 'Our brand brings orders to you. Apply for free.', 'Independent operators — fill your schedule with our brand. No lock-in.', 'Grow your business. 40+ orders/month possible.', 'Partner network — join our brand today. Free registration.'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**Visual Direction:**\nClean display banner: partner silhouette + order notification graphic + brand colours.\nPrompt: "Minimalist display ad visual, friendly silhouette, smartphone showing order notification, brand colour gradient, clean and professional, no text, 300×250"',
      },
      'YouTube Ads': {
        headlines: ['Partners — Join Our Brand', 'Grow Your Business — Apply Now', 'Build Your Customer Base Fast'],
        descriptions: ['See how our brand helps independent operators grow their business with verified orders. Zero upfront cost, flexible schedule, instant payments.', 'Join 150+ verified partners on our platform. Average 40+ orders/month. Apply in 5 minutes.'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**Visual Direction:**\nFirst 5 seconds: Partner receiving a notification, looking pleased. Then testimonial-style "I went from 10 orders a week to 40 with this brand."\nPrompt: "Cinematic close-up of a phone showing an order confirmation notification, hand visible, warm lighting, professional setting, 1280×720"',
      },
      'WhatsApp Ads': {
        headlines: ['Partners — Join Us Today', 'Grow Your Business Free'],
        descriptions: ['Join 150+ partners on our platform. Get verified orders — zero upfront cost, flexible schedule. Apply: example.com/partners', 'Independent operators: our brand fills your schedule. Free to join. 40+ orders/month possible → example.com/partners/apply'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**Visual Direction:**\nSimple image: partner icon with "Join Our Brand" CTA. Clean, WhatsApp-safe.\nPrompt: "Simple clean illustration with brand logo area, white background, brand accent colour, friendly and professional, 800×800"',
      },
    },
  };

  // Default to Customer Acquisition if the specific objective/platform combo isn't defined
  const objectiveKey = objective === 'Partner Recruitment' ? 'Partner Recruitment' : 'Customer Acquisition';
  const platformData = adSets[objectiveKey]?.[platform] ?? adSets['Customer Acquisition']['Google Search'];

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
          placeholder="e.g. A friendly customer using the product on a smartphone in a bright modern environment, smiling and relaxed"
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
  const [objective, setObjective] = useState<typeof CAMPAIGN_OBJECTIVES[number]>('Customer Acquisition');
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

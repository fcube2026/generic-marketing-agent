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
const AI_TOOLS = ['OpenAI gpt-image-1', 'Google Nano Banana'] as const;

const TOOL_TO_PROVIDER: Record<typeof AI_TOOLS[number], 'openai' | 'google'> = {
  'OpenAI gpt-image-1': 'openai',
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
  'Patient Acquisition',
  'Provider Recruitment',
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
    'Square Post (1:1)': 'warm welcoming scene of a professional doctor visiting a patient at home, doctor in white coat smiling, bright modern apartment',
    'Portrait Post (4:5)': 'close-up portrait of a confident smiling Indian doctor holding a medical kit, soft bokeh home background',
    'Story / Reel (9:16)': 'full-height vertical social media visual, doctor at patient door in bright daylight, warm colour palette, mobile-first composition',
    'Landscape Banner (16:9)': 'wide-angle doctor and patient interaction in a cosy living room, doctor reviewing notes on tablet, bright airy room',
    'Twitter/X Card (2:1)': 'horizontal composition doctor at home visit, bold clean design, blue and white healthcare tones, professional photography',
    'LinkedIn Banner (4:1)': 'ultra-wide professional banner, subtle gradient navy to white, doctor silhouette, clean corporate healthcare aesthetic',
    'Pinterest Pin (2:3)': 'tall vertical pin, healthcare booking steps infographic, clean icons, numbered, blue and white',
    'YouTube Thumbnail (16:9)': 'bold YouTube thumbnail composition, high contrast, doctor at door, expressive cinematic scene',
    'Facebook Cover (2.7:1)': 'wide Facebook cover, gradient background, doctor and patient USP illustration, professional brand visual',
    'WhatsApp Status (9:16)': 'vertical WhatsApp status card, friendly doctor avatar, minimal clean design, healthcare blue accent',
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

  return `${customSubject?.trim() ? customSubject.trim() : conceptMap[format]}, ${styleMap[style]}, healthcare blue #1E6FCC accent, professional`;
}

function buildPostImagePrompt(platform: string, pillar: string): string {
  const pillarImages: Record<string, string> = {
    'Education & Awareness': 'educational healthcare scene, doctor explaining to patient in bright home, warm and informative, clear and professional',
    'Trust & Social Proof': 'happy patient giving thumbs up after home doctor visit, warm genuine moment, bright home environment, trustworthy healthcare scene',
    'Product/Service Highlight': 'doctor using smartphone healthcare booking app during home visit, modern technology in healthcare, clean professional scene',
    'Brand Story': 'heartfelt moment between doctor and elderly patient at home, warm emotional lighting, storytelling photography',
    'Community & Engagement': 'diverse group of happy healthy urban Indian people, community healthcare, vibrant energetic social visual',
    'Offer & Promotion': 'vibrant promotional healthcare visual, doctor home visit, energetic call-to-action composition, bold brand colours',
  };

  const platformStyle: Record<string, string> = {
    Instagram: 'Instagram square 1:1 format, high-quality lifestyle photography, warm saturated tones',
    LinkedIn: 'LinkedIn professional landscape format, clean corporate aesthetic, blue and white tones',
    'Twitter/X': 'Twitter card 2:1 horizontal, bold punchy design, high contrast',
    Facebook: 'Facebook post format, engaging lifestyle image, approachable and warm',
    WhatsApp: 'simple clean square image, minimal design, clear and direct, professional',
  };

  return `${pillarImages[pillar] ?? 'professional healthcare social media post, curex24 home doctor service'}, ${platformStyle[platform] ?? 'social media post format'}, healthcare blue accent, premium brand quality`;
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
      hook: platform === 'Twitter/X' ? `🧵 Most people don't know this about home doctor visits — thread 👇` : `Did you know? Getting a doctor home in under 30 minutes is now possible.`,
      body: `At curex24, we're changing what healthcare looks like.\n\nNo waiting rooms. No wasted afternoons. Just verified doctors at your door — same day, every day.\n\n✅ 150+ verified doctors\n✅ Real-time tracking\n✅ Transparent pricing\n✅ Available across Mumbai, Delhi & Bengaluru`,
      cta: platform === 'WhatsApp' ? `Book your first visit → curex24.com` : `👉 Book a home visit today: curex24.com`,
    },
    'Trust & Social Proof': {
      hook: platform === 'Twitter/X' ? `⭐ 4.8 stars. 2,400+ patients. Here's what they say about curex24 👇` : `4.8 ⭐ from 2,400+ patients — here's why curex24 is India's most trusted home healthcare platform.`,
      body: `"The doctor arrived within 25 minutes. She was thorough, kind, and the follow-up prescription was ready in under an hour." — Priya M., Mumbai\n\nWe built curex24 on one principle: healthcare should work around your life, not the other way around.`,
      cta: `Read more patient stories at curex24.com/stories`,
    },
    'Product/Service Highlight': {
      hook: platform === 'Twitter/X' ? `Booking a home doctor visit with curex24 takes exactly 2 minutes. Let me show you. 🧵` : `Your health, on your schedule. Book a verified doctor at home in 2 minutes.`,
      body: `Here's how it works:\n1️⃣ Open curex24.com or the app\n2️⃣ Choose your service (GP, specialist, diagnostics)\n3️⃣ Pick a time slot\n4️⃣ Track your doctor in real time\n5️⃣ Get a digital prescription + follow-up plan\n\nNo more half-day hospital trips.`,
      cta: `Try it today → curex24.com`,
    },
    'Brand Story': {
      hook: platform === 'Twitter/X' ? `We started curex24 because our co-founder couldn't get a doctor for her mother at 11 PM. 🧵` : `Why we built curex24 — a story about a gap in Indian healthcare.`,
      body: `Healthcare in India is brilliant — but access is broken.\n\nOur co-founder spent 4 hours in a hospital for what should have been a 20-minute consultation. That experience became curex24.\n\nToday, 150+ verified doctors use our platform to see patients at home. 1,240 patients trusted us last month alone.\n\nWe're just getting started.`,
      cta: `Join us → curex24.com`,
    },
    'Community & Engagement': {
      hook: platform === 'Twitter/X' ? `Quick poll: when you're not feeling well at home, what do you do first? 👇` : `We want to hear from you 👇`,
      body: `When you're feeling unwell at home — what's your first move?\n\n🏥 Rush to a hospital\n📱 Search symptoms on Google\n🤙 Call a family member / friend\n🏠 Book a home visit\n\nThere's no wrong answer. But we're curious because your answer shapes how we build curex24.`,
      cta: `Drop your answer below ⬇️`,
    },
    'Offer & Promotion': {
      hook: platform === 'Twitter/X' ? `🚨 Limited: ₹100 off your first curex24 home visit this week only. 🧵` : `🎉 First home visit, ₹100 off — this week only.`,
      body: `We want more people to experience what real healthcare convenience feels like.\n\nSo for the next 7 days: your first curex24 home visit is ₹100 off.\n\nNo coupon code needed. Discount applies automatically at checkout.\n\n✅ 150+ verified doctors\n✅ Same-day availability\n✅ Transparent pricing`,
      cta: `Claim your discount → curex24.com/book`,
    },
  };

  const content = pillarContent[pillar] ?? pillarContent['Education & Awareness'];

  const hashtagSets: Record<string, string[]> = {
    Instagram: ['#curex24', '#HomeDoctor', '#HealthcareAtHome', '#MumbaiHealth', '#DelhiDoctors', '#BengaluruHealth', '#HomeVisit', '#DoctorAtHome', '#HealthTech', '#IndiaHealth', '#PatientCare', '#Telemedicine', '#HealthcareIndia', '#WellnessIndia', '#BookADoctor'],
    LinkedIn: ['#HealthTech', '#HealthcareIndia', '#HomeHealthcare', '#curex24'],
    'Twitter/X': ['#HealthTech', '#HomeDoctor'],
    Facebook: ['#HomeDoctor', '#curex24', '#HealthcareAtHome'],
    WhatsApp: [],
  };

  const hashtags = (hashtagSets[platform] ?? []).slice(0, cfg.hashtagCount);

  let output = `**Platform:** ${platform}\n**Pillar:** ${pillar}\n**Tone:** ${tone} — ${toneMap[tone] ?? ''}\n**Format:** ${cfg.format}\n**Max length:** ${cfg.maxChars}\n\n---\n\n`;

  if (platform === 'Twitter/X') {
    output += `**Tweet 1 (hook):**\n${content.hook}\n\n`;
    output += `**Tweet 2:**\n${content.body.split('\n').slice(0, 3).join(' ')}\n\n`;
    output += `**Tweet 3:**\nHere's what makes curex24 different: verified doctors, real-time tracking, digital prescriptions — all from your living room.\n\n`;
    output += `**Tweet 4:**\nWe serve Mumbai, Delhi, and Bengaluru today. More cities coming this quarter.\n\n`;
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
    'OpenAI gpt-image-1':
      'Use descriptive, scene-based prompts. Specify subject, setting, lighting, mood, composition and style. gpt-image-1 follows long, explicit instructions closely. Avoid watermarks/text overlays in the prompt — add typography in your design tool.',
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
    'Square Post (1:1)': 'A warm, welcoming scene of a professional doctor visiting a patient at home. The doctor is wearing a white coat and smiling. The home is bright and modern.',
    'Portrait Post (4:5)': 'A close-up portrait of a confident, smiling doctor holding a medical kit. Soft bokeh background suggesting a home environment.',
    'Story / Reel (9:16)': 'A full-height mobile-first visual. Top: bold headline text area. Middle: doctor at patient\'s door, bright daylight, warm colour palette. Bottom: app booking CTA button area.',
    'Landscape Banner (16:9)': 'Wide-angle scene of a doctor and patient interaction in a cosy living room. Doctor is reviewing notes on a tablet. Bright, airy, healthcare-blue and white tones.',
    'Twitter/X Card (2:1)': 'A horizontal split design: left side — bold headline "Doctor at Home in 30 Min", right side — doctor icon / photo with warm background.',
    'LinkedIn Banner (4:1)': 'Ultra-wide professional banner. Subtle gradient from navy to white. Curex24 logo on left, tagline in centre, doctor silhouette on right.',
    'Pinterest Pin (2:3)': 'Tall pin design with a step-by-step "How to book a home doctor visit" infographic. Clean icons, numbered steps, curex24 brand colours.',
    'YouTube Thumbnail (16:9)': 'Bold thumbnail. Large, readable text overlay: "Doctor at Home in 30 MINUTES?!". Surprised-face reaction image on left, doctor photo on right. High contrast.',
    'Facebook Cover (2.7:1)': 'Wide cover with gradient background. Left: curex24 logo + tagline. Centre: key USPs as icons (speed, trust, tracking). Right: doctor illustration.',
    'WhatsApp Status (9:16)': 'Vertical status card. Top: greeting + brand name. Middle: core message with emoji. Bottom: CTA with phone number or link. WhatsApp green accent.',
  };

  const concept = customSubject?.trim()
    ? customSubject.trim()
    : (conceptMap[format] ?? 'A professional healthcare brand visual for curex24, focusing on home doctor visits.');

  let prompt = `**Format:** ${format}\n**Dimensions:** ${dimensions}\n**Visual Style:** ${style}\n**AI Tool:** ${tool}\n\n`;
  prompt += `---\n\n`;
  prompt += `**Production Prompt:**\n\n`;
  prompt += `${concept}\n\n`;
  prompt += `Style: ${stylePrompts[style] ?? style}.\n\n`;
  prompt += `Brand palette: Healthcare blue (#1E6FCC), clean white (#FFFFFF), warm grey (#F5F5F5), accent green (#22C55E).\n\n`;
  prompt += `Technical: ${dimensions}, optimised for digital display, no text overlaid (add in design tool).\n\n`;

  prompt += `---\n\n**Tool Guidance:**\n${toolGuide[tool] ?? ''}`;

  return prompt;
}

function generateAdCreative(platform: string, objective: string): string {
  const objectiveMap: Record<string, string> = {
    'Brand Awareness': 'maximise impressions and recall among target audience',
    'Patient Acquisition': 'drive first booking completions from high-intent searchers',
    'Provider Recruitment': 'attract verified doctors to join the curex24 provider network',
    'App Install': 'drive app downloads from relevant audiences',
    'Re-engagement / Retargeting': 're-activate users who visited but did not convert',
    'Seasonal Offer': 'drive urgency and immediate bookings with a time-limited offer',
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
    'Patient Acquisition': {
      'Google Search': {
        headlines: ['Doctor at Home in 30 Minutes', 'Book Verified Home Doctor Now', 'Home Visits — Skip the Queue', 'Verified Mumbai Doctors', 'Get a Doctor Home Today', 'Home Healthcare in 2 Min', 'Same-Day Doctor at Home', 'Doctor Home Visit Booking', '4.8★ Home Healthcare App', 'Book in Under 2 Minutes', 'Real-Time Doctor Tracking', 'Home Visits From ₹299', 'GP, Specialist, Diagnostics', 'Curex24 — India\'s #1', 'Home Doctor — Book Now'],
        descriptions: ['Trusted doctors at your doorstep in Mumbai, Delhi & Bengaluru. Book in 2 minutes, real-time tracking, transparent pricing. 4.8★ rated by 2,400+ patients.', 'Home visits by verified doctors. Same-day appointments. No waiting rooms. Get a digital prescription + follow-up plan. Book online in minutes.', 'Skip the hospital queue. 150+ verified doctors available for home visits. Book now and track your doctor in real time — like Uber for healthcare.', 'Curex24: India\'s most trusted home healthcare platform. Verified doctors, transparent pricing, real-time tracking. First visit ₹100 off.'],
        callouts: ['Same-Day Appointments', 'Verified Doctors', 'Real-Time Tracking', 'Transparent Pricing', '4.8★ Rated', 'Digital Prescriptions', 'No Hidden Fees', '150+ Doctors'],
        sitelinks: ['Book Home Visit | curex24.com/book', 'How It Works | curex24.com/how', 'Our Doctors | curex24.com/doctors', 'Pricing | curex24.com/pricing', 'Patient Reviews | curex24.com/reviews', 'FAQ | curex24.com/faq'],
        visualDirection: 'N/A — text-only format',
      },
      'Meta (Facebook/Instagram)': {
        headlines: ['Doctor at Home in 30 Minutes', 'Skip the Hospital Queue', 'Verified Doctors at Your Door'],
        descriptions: ['Book a verified doctor for your home in under 2 minutes. Real-time tracking, transparent pricing, digital prescriptions. Available in Mumbai, Delhi & Bengaluru.', '150+ verified doctors. Same-day home visits. 4.8★ from 2,400+ patients. Book now and get ₹100 off your first visit.', 'Your health deserves convenience. Get a verified doctor home today — no waiting rooms, no wasted time.'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**DALL-E 3 Visual Direction:**\nScene: A friendly, professional doctor arriving at a bright, modern apartment door. Patient (young urban professional) opening the door and smiling. Doctor is holding a medical kit.\nStyle: Photorealistic, warm lighting, welcoming. Brand colours: healthcare blue + clean white.\nDimensions: 1:1 (1080×1080) for feed, 9:16 (1080×1920) for Stories/Reels.\nPrompt: "Photorealistic image of a smiling doctor in a white coat arriving at a modern apartment door, patient welcoming them in, bright natural lighting, warm healthcare setting, medical kit visible, clean and professional, 1080×1080"',
      },
      'LinkedIn Ads': {
        headlines: ['Doctor at Home in 30 Minutes', 'Healthcare That Works Around You', 'Verified Home Doctors — Book Now'],
        descriptions: ['Curex24 brings verified doctors to your home. Same-day availability, real-time tracking, transparent pricing. Trusted by 1,240 patients last month.', 'No waiting rooms. No wasted afternoons. Book a home visit in 2 minutes and get a digital prescription within the hour.', 'Join 1,240+ patients who chose curex24. 150+ verified doctors available in Mumbai, Delhi & Bengaluru. First visit ₹100 off.'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**DALL-E 3 Visual Direction:**\nScene: A professional lifestyle setting — a person working from home on a laptop, looking relieved, with a doctor visible in the background having just completed a visit.\nStyle: Clean, professional, LinkedIn aesthetic. Blue tones, bright and airy.\nDimensions: 1.91:1 (1200×628 px) for LinkedIn single image ad.\nPrompt: "Professional lifestyle photo of a person working from home at a desk, doctor visible in background packing up medical kit, warm home office setting, blue and white colour palette, clean and trustworthy feel, 1200×628"',
      },
      'Google Display': {
        headlines: ['Doctor at Home — Book Now', 'Verified Home Doctor Visits', '30-Min Home Doctor Booking', 'Skip the Hospital Queue', '4.8★ Home Healthcare App'],
        descriptions: ['150+ verified doctors. Same-day home visits. Book in 2 minutes.', 'Transparent pricing, real-time tracking, digital prescriptions.', 'Available in Mumbai, Delhi & Bengaluru. First visit ₹100 off.', 'Trusted by 2,400+ patients. Book your curex24 home visit today.', 'Healthcare on your schedule — verified doctors at your door.'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**DALL-E 3 Visual Direction:**\nCreate a clean display ad visual: doctor icon on warm gradient background (healthcare blue to white). Bold headline space at top, CTA button at bottom.\nSizes needed: 300×250 (medium rectangle), 728×90 (leaderboard), 160×600 (wide skyscraper), 320×50 (mobile banner).\nPrompt for hero image: "Clean healthcare brand illustration, friendly doctor silhouette on a gradient blue-to-white background, minimal flat design, medical cross icon, trustworthy and modern, no text, 300×250"',
      },
      'YouTube Ads': {
        headlines: ['Doctor at Home in 30 Minutes', 'Verified Doctors at Your Door', 'Skip the Hospital — Book Now'],
        descriptions: ['See how curex24 brings verified doctors to your home in 30 minutes. Real-time tracking, transparent pricing, digital prescriptions.', '150+ verified doctors. Same-day availability. Book in 2 minutes. Available in Mumbai, Delhi & Bengaluru.'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**DALL-E 3 Visual Direction:**\nFirst 5 seconds (before skip): High-energy open — close-up of phone screen showing booking confirmation, then cut to doctor arriving at door.\nHero visual for companion banner: Doctor and patient interaction, warm home setting, curex24 branding visible.\nPrompt: "Cinematic close-up of a smartphone screen showing a healthcare booking app confirmation, bright screen, hands holding phone, excited expression visible, photorealistic, 1280×720"',
      },
      'WhatsApp Ads': {
        headlines: ['Doctor Home Visit — Book Now', 'Verified Doctors at Your Door'],
        descriptions: ['150+ verified doctors. Same-day home visits in Mumbai, Delhi & Bengaluru. Book in 2 minutes → curex24.com', 'Skip the hospital queue. Get a verified doctor home today. Transparent pricing. 4.8★ rated. Book now → curex24.com/book'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**DALL-E 3 Visual Direction:**\nSimple, clean WhatsApp-safe image: doctor icon + brand name on a white background with a simple border. Keep it friendly and non-cluttered.\nDimensions: 1:1 (800×800) for WhatsApp image messages.\nPrompt: "Simple clean illustration of a friendly doctor avatar with curex24 branding, white background, healthcare blue accent, minimal design, WhatsApp-safe image, 800×800"',
      },
    },
    'Provider Recruitment': {
      'Google Search': {
        headlines: ['Join curex24 as a Doctor', 'Grow Your Practice — Apply Now', 'Verified Doctors Wanted — Apply', '40+ Bookings/Month Possible', 'Doctor Earnings — Zero Lock-in', 'Independent Doctors — Join Us', 'Medical Practice Growth Tool', 'Earn More as a Home Doctor', 'Doctor Registration — Free', 'Build Your Patient Base Fast', 'Flexible Doctor Schedule', 'Join 150+ Curex24 Doctors', 'Medical Platform India', 'Doctor Home Visit Platform', 'Grow Practice With Curex24'],
        descriptions: ['curex24 connects verified independent doctors with patients who need home visits. 40+ bookings/month possible. Zero upfront cost, no lock-in. Apply today.', 'Independent doctors in Mumbai, Delhi & Bengaluru — grow your practice with curex24. We handle bookings, payments, and marketing. You focus on care.', 'Join 150+ verified doctors on curex24. Set your own hours, choose your speciality and visit types. Payment processed automatically. No upfront fee.', 'Stop chasing patients. curex24 brings bookings to you. Same-day scheduling, transparent earnings, real-time navigation. Apply as a verified doctor today.'],
        callouts: ['Zero Upfront Cost', 'Set Your Own Hours', 'Instant Payments', '40+ Bookings Possible', 'No Lock-in Contract', 'Free to Join', '150+ Active Doctors'],
        sitelinks: ['Apply Now | curex24.com/providers/apply', 'How Earnings Work | curex24.com/providers/earnings', 'Doctor FAQ | curex24.com/providers/faq', 'Success Stories | curex24.com/providers/stories'],
        visualDirection: 'N/A — text-only format',
      },
      'LinkedIn Ads': {
        headlines: ['Independent Doctors — Join curex24', 'Grow Your Practice With curex24', '40+ Bookings/Month on curex24'],
        descriptions: ['Independent doctors in Mumbai, Delhi & Bengaluru — curex24 brings home visit bookings directly to you. Zero upfront cost, flexible schedule, instant payments.', 'Join 150+ verified doctors who use curex24 to grow their practice. Average 40+ bookings/month. No lock-in. Apply in 5 minutes.', 'Stop spending time and money on marketing. curex24 fills your schedule with verified home visit bookings. You focus on care — we handle the rest.'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**DALL-E 3 Visual Direction:**\nScene: A confident, professional doctor reviewing patient bookings on a smartphone. Clean home office or clinic background. Successful, empowered professional vibe.\nStyle: Professional LinkedIn aesthetic, blue tones.\nDimensions: 1200×628 px.\nPrompt: "Confident professional Indian doctor in white coat checking a smartphone with a satisfied expression, bright modern clinic background, professional and trustworthy, blue and white colour palette, 1200×628"',
      },
      'Meta (Facebook/Instagram)': {
        headlines: ['Doctors: Grow Your Practice', 'Join 150+ curex24 Doctors', '40+ Bookings — Zero Marketing'],
        descriptions: ['Independent doctors in Mumbai, Delhi & Bengaluru — curex24 fills your schedule with home visit bookings. Zero upfront cost, no lock-in. Apply today.', 'Tired of empty appointment slots? curex24 brings patients to you. 150+ doctors trust us. 40+ bookings/month average. Free to join.', 'Build your patient base without spending on marketing. curex24 handles discovery, booking, and payment. You just show up and care.'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**DALL-E 3 Visual Direction:**\nScene: A doctor looking at their phone and smiling, with a notification visible showing "New booking confirmed — home visit". Split with brand colours.\nDimensions: 1:1 (1080×1080) for feed, 9:16 (1080×1920) for Stories.\nPrompt: "Indian doctor in white coat happily looking at smartphone notification, bright clean background, healthcare blue accents, professional and approachable, 1080×1080"',
      },
      'Google Display': {
        headlines: ['Doctors — Join curex24', 'Grow Practice With curex24', '40+ Monthly Bookings', 'Zero-Cost Doctor Platform', 'Apply as curex24 Doctor'],
        descriptions: ['Join 150+ doctors. Zero upfront cost, flexible hours, instant payments.', 'curex24 brings home visit bookings to you. Apply for free.', 'Independent doctors — fill your schedule with curex24. No lock-in.', 'Grow your practice. 40+ bookings/month possible with curex24.', 'Doctor network India — join curex24 today. Free registration.'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**DALL-E 3 Visual Direction:**\nClean display banner: doctor silhouette + booking notification graphic + brand colours.\nPrompt: "Minimalist display ad visual, friendly doctor silhouette, smartphone showing booking notification, healthcare blue gradient, clean and professional, no text, 300×250"',
      },
      'YouTube Ads': {
        headlines: ['Doctors — Join curex24', 'Grow Your Practice — Apply Now', 'Build Your Patient Base Fast'],
        descriptions: ['See how curex24 helps independent doctors in India grow their practice with home visit bookings. Zero upfront cost, flexible schedule, instant payments.', 'Join 150+ verified doctors on curex24. Average 40+ bookings/month. Apply in 5 minutes.'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**DALL-E 3 Visual Direction:**\nFirst 5 seconds: Doctor receiving a booking notification, looking pleased. Then testimonial-style "I went from 10 bookings a week to 40 with curex24."\nPrompt: "Cinematic close-up of a doctor\'s phone showing a booking confirmation notification, doctor hand visible, warm lighting, professional setting, 1280×720"',
      },
      'WhatsApp Ads': {
        headlines: ['Doctors — Join curex24 Today', 'Grow Your Practice Free'],
        descriptions: ['Join 150+ doctors on curex24. Get home visit bookings — zero upfront cost, flexible schedule. Apply: curex24.com/providers', 'Independent doctors: curex24 fills your schedule with bookings. Free to join. 40+ bookings/month possible → curex24.com/providers/apply'],
        callouts: [],
        sitelinks: [],
        visualDirection: '**DALL-E 3 Visual Direction:**\nSimple image: doctor + stethoscope icon with "Join curex24" CTA. Clean, WhatsApp-safe.\nPrompt: "Simple clean illustration of a doctor with stethoscope, curex24 logo area, white background, blue accents, friendly and professional, 800×800"',
      },
    },
  };

  // Default to Patient Acquisition if the specific objective/platform combo isn't defined
  const objectiveKey = objective === 'Provider Recruitment' ? 'Provider Recruitment' : 'Patient Acquisition';
  const platformData = adSets[objectiveKey]?.[platform] ?? adSets['Patient Acquisition']['Google Search'];

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
  const [tool, setTool] = useState<typeof AI_TOOLS[number]>('OpenAI gpt-image-1');
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
          placeholder="e.g. A friendly female pediatrician examining a smiling toddler in a bright clinic, parent watching from the side"
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
  const [objective, setObjective] = useState<typeof CAMPAIGN_OBJECTIVES[number]>('Patient Acquisition');
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
        {['OpenAI GPT-4o', 'OpenAI gpt-image-1', 'Google Nano Banana'].map((tool) => (
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

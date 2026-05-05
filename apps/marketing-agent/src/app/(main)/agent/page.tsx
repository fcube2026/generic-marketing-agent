'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type AgentMessage, marketingSkills } from '@/lib/data';
import { GeneratedImage } from '@/components/ui/GeneratedImage';
import { ImageProviderToggle } from '@/components/ui/ImageProviderToggle';
import {
  describeAiError,
  generateChatReply,
  type ChatTurn,
} from '@/lib/services/aiService';

const suggestedPrompts = [
  "Write Google Search ad copy for home visits in Mumbai",
  "Draft a LinkedIn post to recruit providers",
  "Write the Day 3 onboarding email",
  "Suggest 5 SEO article ideas for the health blog",
  "Create a carousel post script for Instagram — 5 slides on home doctor benefits",
  "Write a Twitter/X thread (7 tweets) on why home visits beat clinic queues",
  "Draft a WhatsApp re-engagement message for patients inactive 30 days",
  "Write a 60-second Reels script for your brand — provider day-in-the-life",
  "Create an infographic brief: 'How your brand Works in 4 Steps'",
  "Generate a DALL-E 3 prompt for a home doctor visit Instagram square post",
  "How should I allocate my ₹5L marketing budget?",
  "What's my biggest retention risk right now?",
];

// Canned fallback responses used only when the OpenAI-backed /api/ai/chat
// route is unavailable (e.g. no OPENAI_API_KEY configured). When the LLM is
// healthy we always prefer its live reply.
const agentResponses: Record<string, string> = {
  "Write Google Search ad copy for home visits in Mumbai": `Here are 3 headline and description sets for Google Search — home visits in Mumbai:

**Headline Set A:**
• "Doctor at Home in 30 Minutes"
• "Book Verified Mumbai Doctors"
• "Home Visits — Skip the Queue"

**Headline Set B:**
• "Get a Doctor Home Today"
• "Verified Mumbai Doctors — Book Now"
• "Home Healthcare in 2 Minutes"

**Description 1:**
your brand: trusted doctors at your doorstep in Mumbai. Book in 2 min, real-time tracking, transparent pricing. 4.8★ rated.

**Description 2:**
Home visits by verified doctors in Mumbai. Same-day appointments. Transparent pricing. Book online in minutes.

**Recommendation:** Use "Doctor at Home in 30 Minutes" as your primary headline — it has a specific time claim which drives higher CTR in healthcare searches.`,

  "Draft a LinkedIn post to recruit providers": `Here's a LinkedIn post for provider recruitment:

---

**👨‍⚕️ Independent doctors in Mumbai, Delhi, and Bengaluru — we built something for you.**

Running a solo practice means spending more time chasing patients than actually seeing them.

We built your brand to flip that.

Here's how it works:
→ Patients book you directly on your platform
→ You get same-day notifications
→ You choose your hours and visit types
→ Payment lands in your account automatically

150+ verified doctors are already using your brand. Some are doing 40+ bookings a month.

Zero upfront cost. No lock-in.

If you want to grow your practice without growing your marketing budget, DM me or visit example.com/providers.

#healthcare #doctors #medtech #india

---

**Tip:** Post this yourself as a founder (not from the brand page) — personal posts drive 3x higher engagement on LinkedIn.`,

  "Write the Day 3 onboarding email": `**Day 3 Onboarding Email**

---
**Subject:** Your ₹100 is waiting — book your first home visit today

**Preview text:** Takes 2 minutes. Verified doctors, real-time tracking.

---

Hi [First Name],

You signed up 3 days ago, and we noticed you haven't booked your first visit yet.

That's okay — we just don't want you to miss out.

**For the next 48 hours, your first booking is ₹100 off.**

No coupon needed. It's already in your account.

Here's what happens when you book:

1. Pick a doctor or specialist from 150+ verified providers
2. Choose home visit or clinic
3. Book in under 2 minutes
4. Track your provider in real time (like Uber, but for healthcare)

**[Book your first visit →]**

If you have questions, just reply to this email — we read every message.

Stay healthy,
Your team

---
**Tip:** Send this at 8 PM local time — highest email open rates for healthcare in India are 7–9 PM.`,

  "Suggest 5 SEO article ideas for the health blog": `Here are 5 high-priority SEO article ideas, ranked by traffic + conversion potential:

**1. "Home Doctor Visits in Mumbai: What to Expect, Cost, and How to Book" (2,500 words)**
→ Target keyword: "doctor home visit mumbai" (5,400/mo)
→ Type: Transactional / informational hybrid
→ CTA: Book a home visit

**2. "10 Signs You Should See a Doctor Today (And How to Get One at Home)" (1,800 words)**
→ Target keyword: "when should I see a doctor" (8,900/mo)
→ Type: Informational / symptom awareness
→ CTA: Book same-day consultation

**3. "Home Blood Tests in Delhi: Complete Guide to Lab Collection Services" (2,000 words)**
→ Target keyword: "blood test at home delhi" (4,800/mo)
→ Type: Transactional informational
→ CTA: Book diagnostic collection

**4. "your brand vs Practo: Which Is Better for Home Doctor Visits?" (1,500 words)**
→ Target keyword: "your brand vs practo" + "practo alternative" (1,980/mo combined)
→ Type: Comparison
→ CTA: Try your brand free

**5. "Doctor at Home for Children: A Parent's Guide to Paediatric Home Visits" (2,200 words)**
→ Target keyword: "paediatrician home visit" (2,600/mo)
→ Type: Parent-focused informational
→ CTA: Book paediatric home visit

Start with article 1 — it has the highest direct booking intent.`,

  "Create a carousel post script for Instagram — 5 slides on home doctor benefits": `**Instagram Carousel: "5 Reasons a Home Doctor Visit Beats a Clinic" (5 slides)**

---

**Slide 1 — Hook:**
Headline: "5 Reasons Home Doctor Visits Are Better Than Clinic Queues"
Visual: Doctor at a door, warm natural light, patient opening the door and smiling.
Caption hook: "You deserve healthcare on YOUR schedule. Swipe to see why →"

**Slide 2 — Reason 1:**
Headline: "⏱ No Waiting Rooms"
Body: "The average Indian patient spends 2+ hours in a clinic — 30 minutes seeing the doctor, 90+ minutes waiting. Your home visit: doctor arrives in 30 minutes."
Visual: Side-by-side — crowded waiting room vs. comfortable home setting.

**Slide 3 — Reason 2:**
Headline: "📍 Real-Time Tracking"
Body: "Track your doctor like an Uber ride. You know exactly when they'll arrive. No uncertainty, no wasted afternoons."
Visual: Smartphone showing a map with doctor moving toward home location.

**Slide 4 — Reason 3:**
Headline: "💊 Digital Prescriptions Instantly"
Body: "Your prescription lands in your inbox within the hour. No deciphering handwriting. Share directly with your pharmacy."
Visual: Doctor typing on tablet, patient nodding.

**Slide 5 — CTA:**
Headline: "Book Your Home Visit Today"
Body: "Available in Mumbai, Delhi & Bengaluru. Book in 2 minutes at example.com"
Visual: Bold brand visual with booking CTA. your brand’s logo prominent.
Caption: "Your health, on your schedule. Link in bio to book. 🏠 #HomeDoctor #YourBrand #HealthTech"

---
**Tip:** Post at 7–9 PM on weekdays. Save as a Canva template for rapid weekly use.`,

  "Write a Twitter/X thread (7 tweets) on why home visits beat clinic queues": `**Twitter/X Thread: "Home visits > clinic queues" (7 tweets)**

---

**Tweet 1 (hook):**
🧵 The average Indian patient spends 2 hours in a clinic for a 15-minute consultation.

There's a better way. A thread on why home visits are the future of primary care 👇

**Tweet 2:**
The maths:
• Clinic: 45 min commute + 90 min wait + 15 min visit + 45 min back = 3.5 hours
• Home visit: 2 min to book → doctor arrives in 30 min → done in 45 min total

Same care. 5x less time.

**Tweet 3:**
But it's not just time.

Clinic waiting rooms are genuinely risky. You sit next to people who are sick.

A home visit means zero exposure. Your home, your hygiene standards.

For children, elderly patients, and immunocompromised individuals — this matters enormously.

**Tweet 4:**
"But is the quality as good?"

your brand doctors are:
✅ MBBS/MD verified
✅ NMC registration confirmed
✅ Background-checked
✅ 4.8★ rated by patients

The same doctors who work in leading hospitals also do home visits. Now you can access them in 30 minutes.

**Tweet 5:**
The tech makes it work:
→ Book in 2 minutes
→ Real-time doctor tracking (like Uber)
→ Digital prescription in your inbox
→ Follow-up reminders built in

Primary care has never been this frictionless.

**Tweet 6:**
We're live in Mumbai, Delhi, and Bengaluru.

150+ verified doctors. 1,240 active patients last month. 4.8★ average rating.

And we're just getting started.

**Tweet 7 (CTA):**
If you've ever lost half a day to a clinic queue, try your brand for your next appointment.

Book a home visit → example.com

(Your first visit is ₹100 off right now) #HomeDoctor #HealthTech #YourBrand`,

  "Draft a WhatsApp re-engagement message for patients inactive 30 days": `**WhatsApp Re-engagement Message — 30-Day Inactive Patients**

---

*Hi [First Name]* 👋

It's been a while since your last your brand visit, and we wanted to check in.

Your health doesn't wait for the right moment — and neither do we.

*Book a home visit this week and get ₹100 off* — no code needed, it's already in your account.

What we can help with:
🩺 General consultation
💉 Diagnostics at home
👶 Paediatric visits
👴 Elderly care

Book in 2 minutes → example.com/book

Reply *BOOK* and we'll send you a direct link. Or just tap the link above.

Stay healthy,
Team your brand 🏥

---
**Sending tip:** Send between 7–9 PM. Keep the list under 1,000/day for WhatsApp Business API compliance. Always use opt-in lists only.`,

  "Write a 60-second Reels script for your brand — provider day-in-the-life": `**60-Second Reels Script — Provider Day-in-the-Life**

---

**[0–3 sec] Hook (text on screen + voiceover):**
"I'm a doctor in Mumbai. Here's what my mornings look like now."

Visual: Doctor checking phone, notifications popping up — "3 new bookings today"

**[3–10 sec] The old way (B-roll + text)**
Text: "Before your brand → 6 AM clinic setup, 3 patients by noon, spend afternoons on admin"
Visual: Empty clinic waiting room, paperwork, stressed expression

**[10–25 sec] Your way (action montage)**
Voiceover: "Now, I check my your brand app over morning chai. My day's already planned."
Visuals:
- App showing 5 bookings
- Doctor in car, GPS tracking active
- Knocking on patient door, warmly greeted
- Conducting consultation, taking notes on tablet
- Patient smiling, digital prescription sent

**[25–45 sec] The numbers (data overlay)**
Text animations:
"40+ bookings last month"
"₹0 spent on marketing"
"Payments auto-transferred"
"I set my own hours"

Voiceover: "I grew my patient list by 3x without spending a single rupee on ads."

**[45–55 sec] Human moment**
Voiceover: "But the best part? My patients actually thank me for coming to them."
Visual: Elderly patient thanking the doctor at their door. Genuine moment.

**[55–60 sec] CTA**
Text: "Join 150+ doctors on your platform"
Subtext: "example.com/providers — Free to join, zero lock-in"
Music fades. Logo hold.

---
**Production notes:** Shoot vertical (9:16). Add captions for silent viewing. Use trending audio or original voiceover. Keep edits punchy — max 2-3 sec per clip.`,

  "Create an infographic brief: 'How your brand Works in 4 Steps'": `**Infographic Brief: "How your brand Works in 4 Steps"**

---

**Title:** How your brand Works in 4 Simple Steps

**Format:** Vertical infographic — Pinterest/Instagram (1000×1500 px, 2:3 ratio)
**Style:** Clean flat illustration, healthcare blue (#1E6FCC) + white + accent green (#22C55E)

**Step 1 — "Open your brand"**
Icon: Smartphone with your brand app open
Caption: "Visit example.com or open the app. Choose your service: GP, specialist, or diagnostics."

**Step 2 — "Pick Your Doctor & Time"**
Icon: Calendar with a doctor profile card
Caption: "Browse 150+ verified doctors. Filter by speciality and availability. Book same-day or schedule ahead."

**Step 3 — "Track in Real Time"**
Icon: Map pin with doctor avatar moving toward a home
Caption: "Track your doctor's arrival like an Uber ride. Get notified when they're 10 minutes away."

**Step 4 — "Consultation + Prescription"**
Icon: Checkmark + digital prescription on a phone
Caption: "Doctor visits, examines, and sends your digital prescription within the hour. Follow-up plan included."

**Bottom CTA:**
"Book your home visit at example.com · Available in Mumbai, Delhi & Bengaluru"

---

**DALL-E 3 Visual Prompt:**
"A clean vertical infographic design with 4 steps for a healthcare booking app. Flat illustration style. Step icons: smartphone, calendar/doctor card, map with moving pin, prescription on phone. Healthcare blue (#1E6FCC) and white colour palette, green accent for checkmarks. Minimal, modern, professional. 1000×1500 px."`,

  "Generate a DALL-E 3 prompt for a home doctor visit Instagram square post": `**DALL-E 3 Prompt — Home Doctor Visit Instagram Square Post**

---

**Full prompt:**

"Photorealistic image of a friendly, professional doctor in a white coat arriving at the front door of a bright, modern apartment. The patient — a young urban professional, early 30s — is opening the door and smiling warmly. The doctor is holding a compact medical kit. Natural daylight, warm interior lighting visible through the open door. Clean composition, shallow depth of field with soft bokeh background. Healthcare blue and white tones. No text overlay. Square format 1:1, 1080×1080 pixels. High detail, DSLR quality, 8K resolution."

---

**Variations to test:**

**Variation A — Inside the home:**
"Photorealistic photo of a professional doctor sitting across from a patient in a bright, modern living room. Doctor has a tablet for notes, patient looks relaxed and engaged. Warm natural light from a nearby window. Clean and modern home environment. Healthcare blue accents. 1:1 square format, 1080×1080."

**Variation B — Minimalist brand visual:**
"Minimalist flat illustration of a doctor figure approaching a house, medical kit in hand, blue sky background, clean geometric shapes, healthcare blue (#1E6FCC) and white colour palette, no text, 1:1 square, suitable for Instagram grid."

---
**Tip:** Generate all 3 variations and A/B test in Meta Ads Manager. The photorealistic doorstep scene typically outperforms in patient acquisition campaigns by 15–25% CTR.`,
};

// Image generation is opt-in — the agent only generates a visual when the
// user's message explicitly asks for one (e.g. "image", "visual", "post",
// "carousel", "reel", "thumbnail", "banner", "infographic", "ad creative",
// "dall-e", etc.). For normal text questions the function returns null so
// the reply stays text-only.
const VISUAL_INTENT_KEYWORDS = [
  'image',
  'images',
  'visual',
  'visuals',
  'picture',
  'photo',
  'photograph',
  'illustration',
  'illustrate',
  'infographic',
  'carousel',
  'slide',
  'slides',
  'reel',
  'reels',
  'tiktok',
  'short video',
  'thumbnail',
  'banner',
  'poster',
  'creative',
  'mockup',
  'mock-up',
  'hero shot',
  'graphic',
  'artwork',
  'design a',
  'render',
  'dall-e',
  'dalle',
  'midjourney',
  'stable diffusion',
  'generate a post',
  'generate post',
  'create a post',
  'instagram post',
  'linkedin post',
  'facebook post',
  'whatsapp creative',
  'youtube thumbnail',
  'ad creative',
];

function wantsVisual(msg: string): boolean {
  return VISUAL_INTENT_KEYWORDS.some((kw) => msg.includes(kw));
}

function getImagePromptForRequest(msg: string): string | null {
  // Only generate a visual when the user explicitly asks for one.
  if (!wantsVisual(msg)) return null;

  // Explicit DALL-E / image prompt requests → photorealistic hero shot
  if (msg.includes('dall-e') || msg.includes('dalle') || msg.includes('image prompt') || msg.includes('visual prompt')) {
    return 'photorealistic doctor in white coat arriving at modern apartment door, patient smiling and welcoming, bright natural daylight, warm interior lighting, compact medical kit, shallow depth of field, 8K DSLR quality';
  }

  // Infographic
  if (msg.includes('infographic') || msg.includes('how it works') || msg.includes('4 steps') || msg.includes('four steps')) {
    return 'clean healthcare infographic showing four steps to book a home doctor visit, flat illustration style, healthcare blue and white, numbered step icons, modern minimalist design, vertical format';
  }

  // Carousel / slides
  if (msg.includes('carousel') || msg.includes('slides') || msg.includes('swipe')) {
    return 'Instagram carousel opening slide, professional doctor visiting patient at home, warm welcoming scene, bright modern apartment, healthcare blue and white, photorealistic lifestyle photography';
  }

  // Reels / short video thumbnail
  if (msg.includes('reel') || msg.includes('tiktok') || msg.includes('short video') || msg.includes('day-in-the-life')) {
    return 'vertical social media visual for healthcare brand, smiling doctor in white coat at modern apartment door, warm cinematic lighting, mobile-first 9:16 composition, high quality';
  }

  // Platform-specific posts
  if (msg.includes('instagram')) {
    return 'Instagram square social media post for healthcare brand your brand, doctor home visit lifestyle photography, warm natural lighting, photorealistic, 1:1 format, high quality';
  }
  if (msg.includes('linkedin')) {
    return 'LinkedIn post image for healthcare brand, professional doctor in modern bright home setting, blue and white corporate tones, trustworthy and clean, landscape format';
  }
  if (msg.includes('facebook')) {
    return 'Facebook post visual for healthcare brand, warm doctor-patient home visit scene, inviting lifestyle photography, brand blue and white, high quality';
  }
  if (msg.includes('twitter') || msg.includes('thread') || msg.includes('tweet') || msg.includes(' x ')) {
    return 'Twitter/X header visual for healthcare brand your brand, doctor and patient at home, clean modern composition, blue and white brand palette, 16:9 landscape';
  }
  if (msg.includes('whatsapp')) {
    return 'WhatsApp marketing visual for healthcare brand your brand, friendly doctor with phone notification, warm brand colors, square format, photorealistic';
  }
  if (msg.includes('youtube') || msg.includes('thumbnail')) {
    return 'YouTube thumbnail, doctor home visit your brand, high contrast bold composition, cinematic quality, expressive scene, 16:9 format';
  }

  // Channel / format specific creatives
  if (msg.includes('google') || msg.includes('search ad') || msg.includes('ppc')) {
    return 'Google search ad creative for healthcare brand your brand, clean modern doctor visiting patient at home, professional lifestyle photography, healthcare blue and white, landscape composition';
  }
  if (msg.includes('email') || msg.includes('onboarding') || msg.includes('newsletter')) {
    return 'email header banner for healthcare brand your brand, friendly doctor at modern apartment door welcoming patient, warm natural lighting, clean editorial composition, wide landscape format';
  }
  if (msg.includes('seo') || msg.includes('blog') || msg.includes('article')) {
    return 'editorial blog hero image for healthcare brand your brand, doctor at home with patient, warm photojournalistic style, soft natural light, wide landscape composition, high quality';
  }
  if (msg.includes('recruit') || msg.includes('provider') || msg.includes('doctor') || msg.includes('hire')) {
    return 'professional photograph of confident doctor in white coat smiling at camera in modern bright home environment, premium recruitment marketing visual, healthcare blue accents, photorealistic';
  }
  if (msg.includes('ad copy') || msg.includes('ad creative') || msg.includes('campaign')) {
    return 'premium ad creative for healthcare brand your brand, doctor visiting patient at home, warm cinematic lighting, brand blue and white palette, high-converting lifestyle photography';
  }

  // Strategy / analytics / generic chat → still ship a brand visual
  if (msg.includes('budget') || msg.includes('allocat') || msg.includes('spend')) {
    return 'modern marketing dashboard visualization for healthcare brand your brand, clean charts and growth graphs, blue and white color palette, minimal editorial illustration style';
  }
  if (msg.includes('retention') || msg.includes('churn') || msg.includes('lifecycle')) {
    return 'editorial illustration of patient lifecycle journey for healthcare brand your brand, clean modern flat design, blue and white palette, friendly doctor and patient connection icons';
  }

  // Default fallback — every message gets a high-quality brand visual
  return 'professional social media marketing visual for healthcare brand your brand, doctor visiting patient at home, warm photorealistic scene, healthcare blue accents, premium quality';
}

function getAgentResponse(userMessage: string): string {
  const trimmed = userMessage.trim();

  // Exact key match first
  if (agentResponses[trimmed]) return agentResponses[trimmed];

  // Partial key match — check if message contains the full prompt text
  const match = Object.keys(agentResponses).find((k) => trimmed.toLowerCase() === k.toLowerCase());
  if (match) return agentResponses[match];

  // Keyword branches
  const lower = trimmed.toLowerCase();

  if (lower.includes('budget') || lower.includes('allocat')) {
    return `Based on a ₹5L monthly budget and your current stage (early growth), here's my recommended allocation:

**60% → Google Search (₹3,00,000)**
Highest-intent channel. Patients actively searching for home visits. Start with exact match on your top 10 transactional keywords.

**25% → Meta (₹1,25,000)**
Split: 60% awareness (patient story video), 40% retargeting (non-completions). Meta is a trust-builder, not a direct response channel at this stage.

**10% → Content / SEO (₹50,000)**
Writer + freelance budget for 4 SEO articles/month and social media content. This compounds over time.

**5% → Experimental (₹25,000)**
Test one new channel per quarter. LinkedIn for provider recruitment this quarter.

**Key rule:** Never let any single channel exceed 60% of budget until you have 3+ months of data proving it's sustainable.`;
  }

  if (lower.includes('retention') || lower.includes('churn')) {
    return `Your biggest retention risk right now is the **Day 7-30 drop-off**.

Current data shows:
• D7 retention: ~45% (acceptable)
• D30 retention: 22% (below 25% target)
• Gap: ~20pp of users who came back in week 1 don't return in month 1

**Root cause (most likely):** The post-first-booking flow is too weak. Users complete a booking but receive no next-step nudge to re-engage.

**What to fix first:**
1. **Day 7 post-booking email:** "Follow-up care recommendation" — suggest a related service (e.g., if they saw a GP, recommend a blood panel)
2. **Day 14 push:** "Check how [provider] rated you" — reciprocity nudge
3. **Day 30 re-engagement:** personalised with their booking history + a relevant health reminder

This is a lifecycle fix, not an acquisition fix. Don't spend more on ads until D30 retention improves.`;
  }

  if (lower.includes('carousel') || lower.includes('slides') || lower.includes('swipe')) {
    return agentResponses["Create a carousel post script for Instagram — 5 slides on home doctor benefits"];
  }

  if ((lower.includes('twitter') || lower.includes('thread') || lower.includes('tweet')) && !lower.includes('ad')) {
    return agentResponses["Write a Twitter/X thread (7 tweets) on why home visits beat clinic queues"];
  }

  if (lower.includes('whatsapp') && (lower.includes('re-engage') || lower.includes('inactive') || lower.includes('reactivat'))) {
    return agentResponses["Draft a WhatsApp re-engagement message for patients inactive 30 days"];
  }

  if (lower.includes('reel') || lower.includes('video script') || lower.includes('short video')) {
    return agentResponses["Write a 60-second Reels script for your brand — provider day-in-the-life"];
  }

  if (lower.includes('infographic')) {
    return agentResponses["Create an infographic brief: 'How your brand Works in 4 Steps'"];
  }

  if (lower.includes('dall-e') || lower.includes('dalle') || lower.includes('visual prompt') || lower.includes('image prompt')) {
    return agentResponses["Generate a DALL-E 3 prompt for a home doctor visit Instagram square post"];
  }

  if (lower.includes('this week') || lower.includes('focus') || lower.includes('priority')) {
    return `Here's what I'd focus on this week:

**🔴 Critical — Provider Supply**
Active providers at 148 vs 200 target. This is your #1 growth constraint. Launch the LinkedIn provider recruitment campaign today — I've already drafted the post, just use the one in your agent history or ask me to write a new one.

**🟡 At Risk — Day 3 Onboarding**
Signup → first booking rate is 28% vs 35% target. Activate the Day 3 email A/B test this week. Ask me to write both variants.

**🟢 Quick Win — Referral CTA**
Referrals at 9% vs 15% target. A single CTA on the post-booking confirmation screen could move this significantly. 1-day engineering task with high long-term ROI.

Want me to produce the assets for any of these now? Or head to the **✨ Create Content** studio for full post/ad creative generation.`;
  }

  // Try matching a marketing skill by id, name, or keywords
  const skill = marketingSkills.find(
    (s) =>
      lower.includes(s.id) ||
      lower.includes(s.id.replace(/-/g, ' ')) ||
      lower.includes(s.name.toLowerCase()),
  );
  if (skill) {
    return `**🧠 Skill: ${skill.icon} ${skill.name}** — _${skill.category}_

${skill.description}

Here's how I'd run this skill for **your brand**:

**1. Discovery**
• Pull the latest data from your business intake (ICP, budget, bottleneck) and recent KPIs.
• Identify the specific outcome we're optimising for.

**2. Framework**
• Apply the proven \`${skill.id}\` workflow — frameworks, templates, and benchmarks from the marketing-skills library.
• Tailor every step to your brand's home-doctor positioning and Mumbai/Delhi/Bengaluru markets.

**3. Output**
• Ready-to-ship deliverables (copy, briefs, plans, or tracking specs) with clear next steps and owners.

**Suggested starting prompt:**
> "${skill.examplePrompt}"

Want me to run this skill end-to-end now? Reply with **yes — run ${skill.id}**, or refine the prompt above.`;
  }

  // Intent-aware structured drafts — produced specifically for the user's
  // prompt so the fallback never returns generic boilerplate.
  const intentReply = getIntentDraft(trimmed, lower);
  if (intentReply) return intentReply;

  return `Here's a starter answer for **"${trimmed}"** — tailored to your brand (at-home doctor visits in Mumbai / Delhi / Bengaluru, early-growth stage, ₹5L/mo budget).

**Recommended structure:**
1. **Audience & intent** — who exactly is this for, and what are they trying to do right now?
2. **Core message** — the single most important thing to communicate (one sentence).
3. **Proof points** — 3 specific, credible reasons (verified doctors, transparent pricing, 30-min ETA, 4.8★ rating, 150+ providers, etc.).
4. **Call to action** — exactly one primary CTA that maps to a measurable conversion.
5. **Distribution** — which channel(s) and what format (post / email / page / ad).

**Suggested next step for "${trimmed}":**
• Tell me the channel/format (e.g. "as a landing page", "as a Google ad set", "as a 5-slide carousel") and I'll produce the full draft.
• Or open the **✨ Create Content** studio for fully-formatted post / visual / ad creative output.`;
}

// ---------------------------------------------------------------------------
// Intent-aware fallback drafts
// ---------------------------------------------------------------------------
// When the live LLM is unavailable we still want the agent to actually
// engage with the user's prompt. These helpers pattern-match common content
// requests (comparison page, landing page, blog outline, ad copy, email,
// social post, hero, pricing, etc.) and emit a tailored starter draft that
// re-uses the user's phrasing instead of dumping the same boilerplate.
function getIntentDraft(prompt: string, lower: string): string | null {
  // ---- Comparison / vs / alternatives page ------------------------------
  // e.g. "Write your vs Practo comparison page optimised for SEO..."
  if (
    lower.includes('comparison page') ||
    lower.includes('alternatives page') ||
    lower.includes(' alternative') ||
    /\bvs\.?\b/.test(lower) ||
    /\bversus\b/.test(lower)
  ) {
    const competitor = extractCompetitor(prompt);
    return `**📄 Comparison page draft — your brand vs ${competitor}**
_Optimised for SEO + bottom-of-funnel conversion_

**Target query cluster:**
• "${competitor.toLowerCase()} vs your brand"
• "${competitor.toLowerCase()} alternatives"
• "best home doctor service india"
• "${competitor.toLowerCase()} home visit price"

**URL:** \`/compare/${slugify(competitor)}-vs-yourbrand\`
**Title tag:** your brand vs ${competitor} — Which Home Doctor Service Wins in 2026?
**Meta description:** Compare your brand and ${competitor} on price, doctor verification, ETA and coverage in Mumbai, Delhi and Bengaluru. Independent side-by-side breakdown.

**Page sections (in order):**
1. **H1** — your brand vs ${competitor}: Side-by-Side for Home Doctor Visits
2. **TL;DR comparison table** — 6 rows: ETA, price (₹), doctor verification, cities live, payment options, refund policy
3. **Who should pick which?** — 2 short paragraphs ("Pick your brand if…" / "Pick ${competitor} if…") — honest, not snarky
4. **Feature-by-feature breakdown** — 4–6 H2 sections, each with a 2-column table and 2-line summary
5. **Pricing comparison** — real ₹ examples for GP visit, blood test, repeat consult
6. **What real patients say** — 2 short verified quotes per side (no fabricated testimonials)
7. **FAQ schema block** — 5 Qs (price, coverage, refund, emergency, insurance) with FAQPage JSON-LD
8. **Bottom-of-funnel CTA** — "Book your home visit in 2 minutes" with phone number + WhatsApp deep-link
9. **Related comparisons** — internal links to /compare/* siblings (programmatic-SEO hub)

**On-page SEO checklist:**
• Comparison schema (Product + Review) — ⚠️ avoid \`Review\` markup if you can't surface real reviews on-page (Google penalty risk).
• Internal link from /pricing, /how-it-works, and the city pages.
• 1 outbound link to ${competitor}'s homepage (rel="nofollow") — earns trust signals.
• Image alt text uses the literal query "${competitor.toLowerCase()} vs your brand".

**CRO levers (BoFU):**
• Sticky bottom bar on mobile with "Book in 2 min — ₹X visit fee in your city".
• Exit-intent overlay: "Not sure? Get a free 5-min call with your doctor — ₹0".
• Trust strip directly above the CTA: "150+ verified doctors • 4.8★ • Refund if doctor doesn't arrive in 60 min".

Want me to expand any section into final copy, or generate the comparison table rows with concrete claims?`;
  }

  // ---- Landing page -----------------------------------------------------
  if (lower.includes('landing page') || lower.includes('lander') || lower.includes('squeeze page')) {
    return `**📄 Landing page draft for: "${prompt}"**

**Above the fold:**
• **H1:** [single benefit-led headline — verb + outcome + timeframe, e.g. "See a verified doctor at home in 30 minutes"]
• **Subhead:** one line covering price, coverage, trust signal
• **Primary CTA button:** "Book in 2 min" (mobile-first, ≥48px, accent colour)
• **Hero visual:** doctor at apartment door, warm/natural lighting (use Visual Generator)
• **Trust strip:** "150+ verified doctors • Mumbai / Delhi / Bengaluru • 4.8★ on 12k bookings"

**Section order (top → bottom):**
1. Hero (above)
2. **3 ICP-pain bullets** — what your brand fixes (queue, travel, unverified doctors)
3. **How it works — 4 steps** — book → match → arrive → pay (use the infographic brief)
4. **What's included** — visit fee, prescription, lab order if needed
5. **Social proof** — 3 short quotes + city + verified badge
6. **Pricing transparency block** — exact ₹ for GP / specialist / paediatric, "no surge"
7. **Risk reversal** — "Refund if doctor doesn't arrive on time"
8. **FAQ** (6–8 questions, FAQPage schema)
9. **Final CTA repeat** — sticky on mobile

**Conversion checklist:**
• One CTA per screen, same colour, same wording.
• Form ≤3 fields (phone, city, time slot). Phone-only "instant call back" variant for a/b test.
• Page weight <300KB above-the-fold; LCP <2.5s on 4G.
• Track: scroll depth 25/50/75/100, CTA click, form submit, phone-tap, WhatsApp-tap.

Tell me the channel this LP is for (Google Search / Meta cold / WhatsApp blast / SEO) and I'll tailor headline, proof, and offer accordingly.`;
  }

  // ---- Homepage / hero section -----------------------------------------
  if (lower.includes('homepage') || lower.includes('home page') || lower.includes('hero section') || lower.includes('hero copy')) {
    return `**🏠 Homepage / hero draft**

**Hero H1 (3 options to A/B):**
A) Doctor at your door in 30 minutes
B) India's most trusted at-home doctor service
C) Skip the queue. See a doctor at home today.

**Subhead:** Verified GPs, paediatricians and specialists across Mumbai, Delhi and Bengaluru. Transparent ₹ pricing. Book in 2 minutes.

**Primary CTA:** Book a home visit
**Secondary CTA:** See pricing in your city

**Below the fold (in order):**
1. **3-up "why your brand"** — Verified · Transparent · Fast
2. **How it works — 4 cards** — Book / Match / Visit / Pay
3. **Services** — GP, Paediatric, Diagnostics, Pharmacy delivery (each links out)
4. **Cities live** — Mumbai, Delhi, Bengaluru (clickable city pages)
5. **Trust block** — 150+ doctors · 4.8★ · 12k bookings
6. **Press / partners strip**
7. **Final CTA** — sticky mobile

**Tracking events:** \`hero_cta_click\`, \`city_select\`, \`pricing_view\`, \`book_start\`, \`book_complete\`.

Want full final copy for a specific variant (A / B / C)?`;
  }

  // ---- Pricing page -----------------------------------------------------
  if (lower.includes('pricing page') || lower.includes('pricing strategy') || lower.includes('plans page') || (lower.includes('pricing') && (lower.includes('page') || lower.includes('write')))) {
    return `**💰 Pricing page draft**

**Promise above the fold:** "Transparent ₹ pricing. No surge. No surprise charges."

**Layout:** 3-column comparison (GP / Specialist / Paediatric) — each column shows:
• City-level ₹ (Mumbai / Delhi / Bengaluru tabs)
• What's included (visit fee, prescription, follow-up window, refund window)
• Primary CTA — "Book a [GP] home visit"

**Below the table:**
• **Add-ons** — diagnostics, pharmacy delivery (link to those pages)
• **Insurance & corporate** — single CTA for HR partnerships
• **FAQ** — "Why these prices?", "Is there a cancellation fee?", "Do I pay before or after?", "Refund policy?"

**Conversion levers:**
• Show savings vs. competitor avg (use the comparison page data, no fabricated numbers).
• Add "Most booked in Mumbai" badge on the busiest column.
• Sticky bottom CTA on mobile with the cheapest visible price.

**Schema:** \`Product\` + \`Offer\` per service, with \`priceCurrency: INR\` and \`areaServed\`.

Want me to draft the actual ₹ table rows or the FAQ copy in full?`;
  }

  // ---- SEO blog / article outline --------------------------------------
  if (
    lower.includes('blog post') ||
    lower.includes('blog article') ||
    lower.includes('seo article') ||
    lower.includes('seo post') ||
    lower.includes('article ideas') ||
    (lower.includes('seo') && (lower.includes('write') || lower.includes('outline') || lower.includes('draft')))
  ) {
    return `**📝 SEO article outline for: "${prompt}"**

**Search intent:** informational with commercial undertone (assumed — confirm).
**Primary keyword cluster:** [pull from Search Console / Ahrefs — e.g. "home doctor visit mumbai", "doctor at home cost"].

**URL:** \`/blog/${slugify(prompt).slice(0, 60)}\`
**Title tag (≤60 chars):** [keyword] — [benefit] | your brand
**Meta description (≤155 chars):** Plain-English answer in one sentence + soft CTA.

**Outline (H2 / H3):**
1. **TL;DR** — 3-bullet answer block (so AI Overviews / featured snippets can lift it).
2. **What is [topic]?** — definition + when it's relevant.
3. **How it works step-by-step** — numbered list, screenshot-able.
4. **Cost in India** — real ₹ ranges per city (Mumbai / Delhi / Bengaluru).
5. **When you should NOT use this** — honest, builds trust.
6. **How your brand does this** — single paragraph + product link (soft CTA).
7. **FAQ** — 5 questions with FAQPage JSON-LD.

**On-page checklist:**
• Word count: 1,200–1,800 (match top-3 competitors, don't pad).
• Internal links: 2 to service pages, 1 to a city page, 1 to a related blog.
• Featured snippet target: put the 40–60-word answer at the very top.
• Image: 1 hero (use Visual Generator) + 1 diagram. Alt text uses primary keyword.

**Distribution after publish:**
• LinkedIn post + Twitter thread re-purposed from TL;DR.
• Internal link from the city page within 7 days.
• Re-check rank at day 14 / 30; refresh at day 90 if stuck >position 8.

Want me to flesh out a specific section into final copy?`;
  }

  // ---- Email / sequence ------------------------------------------------
  if (
    lower.includes('email sequence') ||
    lower.includes('drip campaign') ||
    lower.includes('lifecycle email') ||
    (lower.includes('email') && (lower.includes('write') || lower.includes('draft') || lower.includes('day')))
  ) {
    return `**📬 Email draft for: "${prompt}"**

**Subject line (3 to A/B):**
A) [Specific outcome in 5 words]
B) [Question that names the user's pain]
C) [Number + benefit, e.g. "₹X off your next home visit"]

**Preheader:** One-line value prop, 40–80 chars, doesn't repeat the subject.

**Body structure (≤120 words):**
1. **Hook** — one sentence connecting to a recent action or pain.
2. **Value** — 2–3 bullets of what they get.
3. **Single CTA** — button + plain-text link backup ("Book your home visit →").
4. **PS** — soft trust signal ("Refund if doctor doesn't arrive on time").

**Send rules:**
• Tuesday or Thursday, 10:00 IST (India open-rate sweet spot).
• Throttle: 1 marketing email per user per 72h.
• Suppress: anyone with an active booking in the last 24h.

**Tracking:** \`email_sent\`, \`email_open\`, \`email_click\` (per CTA), \`email_unsubscribe\`. Attribute revenue with a 7-day post-click + 1-day post-open window.

Tell me the lifecycle stage (welcome / activation / re-engage / win-back) and I'll write the full final copy.`;
  }

  // ---- Ad copy / Google / Meta / LinkedIn ads --------------------------
  if (
    lower.includes('ad copy') ||
    lower.includes('ad set') ||
    lower.includes('google ad') ||
    lower.includes('meta ad') ||
    lower.includes('facebook ad') ||
    lower.includes('linkedin ad') ||
    lower.includes('youtube ad') ||
    lower.includes('search ad') ||
    lower.includes('display ad') ||
    (lower.includes('ad') && lower.includes('write'))
  ) {
    const platform = detectAdPlatform(lower);
    return `**🎯 ${platform} ad draft for: "${prompt}"**

**Headlines (3 to test, ≤30 chars each):**
1. Doctor at Home in 30 Min
2. Verified Mumbai Doctors
3. Skip the Queue — Book Now

**Descriptions (2 to test, ≤90 chars):**
A) Verified doctors at your doorstep. Transparent ₹ pricing. Book in 2 minutes.
B) Same-day home visits. 4.8★ rated. Refund if doctor doesn't arrive on time.

**Primary text / long copy (Meta / LinkedIn):**
Tired of waiting hours at a clinic? your brand sends a verified doctor to your home in under 30 minutes — Mumbai, Delhi and Bengaluru. Transparent ₹ pricing, real-time tracking, 4.8★ from 12,000+ patients. Book in 2 minutes.

**CTA button:** Book Now
**Landing page:** /book?utm_source=${platform.toLowerCase().replace(/[^a-z]/g, '')}&utm_medium=cpc&utm_campaign=[campaign]
**Targeting hint:** city = Mumbai/Delhi/Bengaluru, age 28–55, intent keywords ("doctor near me", "home doctor", "GP appointment").

**Measurement:**
• Conversion event: \`book_complete\`, value = visit fee in INR.
• Optimisation: 7-day click + 1-day view.
• Frequency cap: 3/week.

Want full RSA assets (15 headlines × 4 descriptions) or a Meta carousel variant?`;
  }

  // ---- Social post (Instagram / LinkedIn / Facebook / Twitter) ---------
  if (
    lower.includes('instagram post') ||
    lower.includes('linkedin post') ||
    lower.includes('facebook post') ||
    lower.includes('twitter post') ||
    lower.includes('x post') ||
    lower.includes('social post') ||
    (lower.includes('post') && (lower.includes('write') || lower.includes('draft')))
  ) {
    return `**📲 Social post draft for: "${prompt}"**

**Hook (first line — must earn the scroll-stop):**
[Bold contrarian statement OR a specific number, e.g. "We saw 1,247 home patients in Mumbai last month. Here's what surprised us."]

**Body (3–5 short lines, one idea per line):**
• Concrete pain or insight
• Specific proof / data point
• What this means for the reader

**CTA (last line):**
"Book your home visit → example.com" OR a question that drives comments.

**Hashtags (3–5, mix of broad + niche):** #healthcare #doctorathome #mumbaihealth #healthtechindia

**Visual:** square 1:1 (Instagram) / 1.91:1 (LinkedIn) — use the Visual Generator.

**Best post time (India):** Tue/Wed/Thu 09:30 or 19:00 IST.

Tell me the platform + content pillar (Education / Trust / Promo / Behind-the-scenes / Patient story / Doctor story) and I'll write the final copy.`;
  }

  // ---- WhatsApp / SMS / push -------------------------------------------
  if (lower.includes('whatsapp') || lower.includes(' sms') || lower.includes('push notification') || lower.includes('push notif')) {
    const channel = lower.includes('whatsapp') ? 'WhatsApp' : lower.includes('sms') ? 'SMS' : 'Push';
    return `**💬 ${channel} draft for: "${prompt}"**

**Message (≤160 chars for SMS, ≤200 for ${channel}):**
"Hi [Name] — your last your brand visit was [N] days ago. Need a doctor today? Book in 2 min: [shortlink]. Reply STOP to opt out."

**Best practice:**
• Personalise with first name + last booking detail (real data, never fabricated).
• Single shortlink with UTM (\`utm_source=${channel.toLowerCase()}&utm_medium=lifecycle\`).
• Send window: 10:00–19:00 IST. Never on Sunday before 11:00.
• Frequency cap: 1 message per user per 7 days for non-transactional.
• Always include opt-out (TRAI / WhatsApp policy compliance).

**Measurement:** delivered → clicked → booked, attribute within 24h click window.

Want a 3-message sequence (day 0 / day 3 / day 7) or a single broadcast?`;
  }

  // ---- Feature page ----------------------------------------------------
  if (lower.includes('feature page') || lower.includes('product page')) {
    return `**🧩 Feature page draft for: "${prompt}"**

**Above the fold:**
• **H1:** [feature name] — [outcome it delivers]
• **Subhead:** one line covering who it's for + the headline benefit
• **Primary CTA:** Book / Try / See pricing
• **Visual:** product screenshot or lifestyle hero

**Sections:**
1. **The problem** — 1 short paragraph, name the pain literally
2. **How [feature] works** — 3-step illustrated breakdown
3. **What you get** — 4–6 concrete bullets (no marketing fluff)
4. **Who it's for** — 2–3 ICP cards (with city + use case)
5. **Proof** — 2 quotes + 1 number (e.g. "Avg ETA: 27 min in Mumbai")
6. **FAQ** — 5 Qs with FAQPage schema
7. **Final CTA** — sticky on mobile

**Conversion checklist:** one CTA, ≤3 form fields, page weight <300KB AFT, LCP <2.5s.

Want me to expand any section into final copy?`;
  }

  return null;
}

function extractCompetitor(prompt: string): string {
  // Heuristics: "<our brand> vs X comparison page" → X. The leading brand
  // token is optional so generic prompts like "vs Acme comparison" also work.
  const vsMatch = prompt.match(/vs\.?\s+([A-Za-z0-9][\w.\-]*(?:\s+[A-Z][\w.\-]*){0,2})/i);
  if (vsMatch?.[1]) return vsMatch[1].trim().replace(/\s+(comparison|page|alternatives?|article|landing).*$/i, '').trim();
  const altMatch = prompt.match(/([A-Za-z0-9][\w.\-]*)\s+alternatives?/i);
  if (altMatch?.[1]) return altMatch[1].trim();
  return 'the competitor';
}

function detectAdPlatform(lower: string): string {
  if (lower.includes('google') || lower.includes('search ad')) return 'Google Ads';
  if (lower.includes('linkedin')) return 'LinkedIn Ads';
  if (lower.includes('youtube')) return 'YouTube Ads';
  if (lower.includes('meta') || lower.includes('facebook') || lower.includes('instagram')) return 'Meta Ads';
  return 'Ad';
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const INTRO_MESSAGE: AgentMessage = {
  role: 'agent',
  content: `👋 I'm your AI Marketing Agent for your brand — powered by **OpenAI GPT-4o** for chat and strategy and **OpenAI DALL-E 3** for on-demand visuals.

I can run **${marketingSkills.length}+ specialised marketing skills** end-to-end — from \`page-cro\` and \`copywriting\` to \`churn-prevention\`, \`ai-seo\`, \`pricing-strategy\`, and \`referral-program\`.

Here's what I can do for you:

✍️ **Write** — ad copy, email sequences, social posts, Reels scripts, WhatsApp campaigns
📊 **Strategise** — budget allocation, channel prioritisation, retention analysis
🖼️ **Generate visuals on request** — ask for an image, post, carousel, reel, infographic, banner or ad creative and I'll ship a real AI-generated visual ready to download. Plain questions get a plain text answer.
📣 **Build campaigns** — Google, Meta, LinkedIn, YouTube — full creative packages
🧠 **Run skills** — browse the full catalogue in **Skills Library** or just ask me by name (e.g. "run cold-email", "do an seo-audit").

For complete content production (Post Generator, Visual Generator, Ad Creative Generator), visit the **✨ Create Content** studio in the sidebar.

What would you like to tackle first?`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

function MessageBubble({ msg }: { msg: AgentMessage }) {
  const isAgent = msg.role === 'agent';
  return (
    <div className={`flex ${isAgent ? 'justify-start' : 'justify-end'} mb-4`}>
      {isAgent && (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0 mr-3 mt-1" aria-label="AI Marketing Agent">
          🤖
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
          isAgent
            ? 'bg-white border border-gray-200 text-gray-800 shadow-sm'
            : 'bg-primary text-white'
        }`}
      >
        <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
        {msg.imagePrompt && (
          <div className="mt-3">
            <GeneratedImage prompt={msg.imagePrompt} label="AI-Generated Visual" />
          </div>
        )}
        <div className={`text-xs mt-1 ${isAgent ? 'text-gray-400' : 'text-primary-light'}`}>{msg.timestamp}</div>
      </div>
      {!isAgent && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold shrink-0 ml-3 mt-1" aria-label="User avatar">
          You
        </div>
      )}
    </div>
  );
}

export default function AgentPage() {
  return (
    <Suspense fallback={null}>
      <AgentPageInner />
    </Suspense>
  );
}

function AgentPageInner() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<AgentMessage[]>([INTRO_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const handledSkillRef = useRef<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const userMsg: AgentMessage = { role: 'user', content: trimmed, timestamp: now };

      // Snapshot history at submit time (last ~10 turns, agent intro excluded
      // because the brand intro lives in the server-side system prompt).
      //
      // IMPORTANT: build `history` synchronously *before* calling setMessages.
      // React 18 may invoke functional updaters later during render, which
      // would mean the async generateChatReply() below fires with an empty
      // history and the server rejects the request as `messages must not be
      // empty`. Reading from the closure-captured `messages` is safe here
      // because `send` is recreated whenever `messages` changes (via the
      // useCallback dep below).
      const nextMessages = [...messages, userMsg];
      const history: ChatTurn[] = nextMessages
        .slice(1) // drop INTRO_MESSAGE
        .slice(-10)
        .map<ChatTurn>((m) => ({
          role: m.role === 'agent' ? 'assistant' : 'user',
          content: m.content,
        }));
      setMessages(nextMessages);
      setInput('');
      setIsTyping(true);

      const imagePrompt = getImagePromptForRequest(trimmed.toLowerCase());

      (async () => {
        let content: string;
        try {
          const result = await generateChatReply({ messages: history });
          content = result.reply;
        } catch (err) {
          // If the LLM is unavailable (no API key, upstream error, etc.) fall
          // back to the intent-aware canned response set so the UI stays
          // useful. Surface the warning at the TOP of the message so the user
          // immediately understands why they're seeing a draft instead of a
          // live AI answer (rather than burying it at the bottom).
          const fallback = getAgentResponse(trimmed);
          const reason = describeAiError(err, 'unknown error');
          content = `> ⚠️ **Live AI is currently unavailable** (${reason}). Showing a tailored offline draft below — set \`OPENAI_API_KEY\` on the server to restore full GPT-4o responses.\n\n${fallback}`;
        }
        const agentMsg: AgentMessage = {
          role: 'agent',
          content,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ...(imagePrompt ? { imagePrompt } : {}),
        };
        setMessages((prev) => [...prev, agentMsg]);
        setIsTyping(false);
      })();
    },
    [messages],
  );

  // If the page is opened with ?skill=<id>, auto-send that skill's example prompt once.
  useEffect(() => {
    const skillId = searchParams?.get('skill');
    if (!skillId || handledSkillRef.current === skillId) return;
    const skill = marketingSkills.find((s) => s.id === skillId);
    if (!skill) return;
    handledSkillRef.current = skillId;
    send(skill.examplePrompt);
  }, [searchParams, send]);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto">
      {/* AI Skills Banner */}
      <div className="bg-gradient-to-r from-primary/10 to-purple-50 border border-primary/20 rounded-xl px-4 py-2.5 flex flex-wrap items-center gap-2 mb-3 shrink-0">
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">Powered by</span>
        {['OpenAI GPT-4o', 'OpenAI DALL-E 3', 'Google Nano Banana'].map((tool) => (
          <span key={tool} className="text-xs px-2 py-0.5 bg-white border border-gray-200 rounded-full text-gray-700 font-medium">
            {tool}
          </span>
        ))}
        <ImageProviderToggle className="ml-auto" hideLabel />
        <Link href="/skills" className="text-xs px-3 py-1 bg-white border border-primary/30 text-primary rounded-full font-semibold hover:bg-primary/10 transition shrink-0">
          🧠 Skills Library →
        </Link>
        <Link href="/create" className="text-xs px-3 py-1 bg-primary text-white rounded-full font-semibold hover:bg-primary-dark transition shrink-0">
          ✨ Create Studio →
        </Link>
      </div>

      {/* Suggested prompts — row 1 */}
      <div className="flex gap-2 flex-wrap mb-3 shrink-0">
        {suggestedPrompts.slice(0, 6).map((p) => (
          <button
            key={p}
            onClick={() => send(p)}
            className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full text-gray-600 hover:border-primary hover:text-primary transition"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chat window */}
      <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 overflow-y-auto p-4 mb-3">
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}
        {isTyping && (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0" aria-label="AI Marketing Agent">🤖</div>
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts — row 2 */}
      <div className="flex gap-2 flex-wrap mb-3 shrink-0">
        {suggestedPrompts.slice(6).map((p) => (
          <button
            key={p}
            onClick={() => send(p)}
            className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full text-gray-600 hover:border-primary hover:text-primary transition"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder="Ask your marketing agent anything..."
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || isTyping}
          className="px-5 py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark transition disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

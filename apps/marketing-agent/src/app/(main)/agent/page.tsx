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
  "Write Google Search ad copy for our launch in our top city",
  "Draft a LinkedIn post to recruit partners",
  "Write the Day 3 onboarding email",
  "Suggest 5 SEO article ideas for our blog",
  "Create a carousel post script for Instagram — 5 slides on our key benefits",
  "Write a Twitter/X thread (7 tweets) on why our product beats the status quo",
  "Draft a WhatsApp re-engagement message for customers inactive 30 days",
  "Write a 60-second Reels script — partner day-in-the-life",
  "Create an infographic brief: 'How Our Brand Works in 4 Steps'",
  "Generate a DALL-E 3 prompt for a brand lifestyle Instagram square post",
  "How should I allocate my marketing budget?",
  "What's my biggest retention risk right now?",
];

// Canned fallback responses used only when the OpenAI-backed /api/ai/chat
// route is unavailable (e.g. no OPENAI_API_KEY configured). When the LLM is
// healthy we always prefer its live reply.
const agentResponses: Record<string, string> = {
  "Write Google Search ad copy for our launch in our top city": `Here are 3 headline and description sets for Google Search:

**Headline Set A:**
• "Get Started in 2 Minutes"
• "Trusted Partners Near You"
• "Skip the Queue — Sign Up Now"

**Headline Set B:**
• "Try Our Brand Today"
• "Verified Partners — Sign Up Now"
• "On-Demand Service in 2 Min"

**Description 1:**
Our brand: trusted partners at your service. Sign up in 2 min, real-time updates, transparent pricing. 4.8★ rated.

**Description 2:**
Service by verified partners. Same-day availability. Transparent pricing. Sign up online in minutes.

**Recommendation:** Use "Get Started in 2 Minutes" as your primary headline — a specific time claim drives higher CTR.`,

  "Draft a LinkedIn post to recruit partners": `Here's a LinkedIn post for partner recruitment:

---

**🤝 Independent operators in our priority cities — we built something for you.**

Running a solo business means spending more time chasing customers than actually serving them.

We built our brand to flip that.

Here's how it works:
→ Customers find you directly on our platform
→ You get same-day notifications
→ You choose your hours and service types
→ Payment lands in your account automatically

150+ verified partners are already using our brand. Some are doing 40+ orders a month.

Zero upfront cost. No lock-in.

If you want to grow your business without growing your marketing budget, DM me or visit example.com/partners.

#startup #entrepreneurship #growth

---

**Tip:** Post this yourself as a founder (not from the brand page) — personal posts drive 3x higher engagement on LinkedIn.`,

  "Write the Day 3 onboarding email": `**Day 3 Onboarding Email**

---
**Subject:** Your credit is waiting — get started today

**Preview text:** Takes 2 minutes. Verified partners, real-time updates.

---

Hi [First Name],

You signed up 3 days ago, and we noticed you haven't placed your first order yet.

That's okay — we just don't want you to miss out.

**For the next 48 hours, your first order is 10% off.**

No coupon needed. It's already in your account.

Here's what happens when you order:

1. Pick a partner from 150+ verified options
2. Choose what you need
3. Sign up in under 2 minutes
4. Track your order in real time

**[Place your first order →]**

If you have questions, just reply to this email — we read every message.

Thanks,
The team

---
**Tip:** Send this at 8 PM local time — peak email open rates for consumer brands are 7–9 PM.`,

  "Suggest 5 SEO article ideas for our blog": `Here are 5 high-priority SEO article ideas, ranked by traffic + conversion potential:

**1. "How Our Service Works in [City]: What to Expect, Cost, and How to Get Started" (2,500 words)**
→ Target keyword: "[primary service] in [city]"
→ Type: Transactional / informational hybrid
→ CTA: Get started

**2. "10 Signs You Should Try [Category] Today (And How to Get Started)" (1,800 words)**
→ Target keyword: "when should I [task]"
→ Type: Informational / awareness
→ CTA: Sign up

**3. "Complete Guide to [Adjacent Service] in [City]" (2,000 words)**
→ Target keyword: "[adjacent service] in [city]"
→ Type: Transactional informational
→ CTA: Book the adjacent service

**4. "Our Brand vs [Competitor]: Which Is Better for [Use Case]?" (1,500 words)**
→ Target keyword: "[brand] vs [competitor]" + "[competitor] alternative"
→ Type: Comparison
→ CTA: Try our brand free

**5. "[Category] for [Specific Persona]: A Buyer's Guide" (2,200 words)**
→ Target keyword: "[category] for [persona]"
→ Type: Persona-focused informational
→ CTA: Sign up for the relevant service

Start with article 1 — it has the highest direct conversion intent.`,

  "Create a carousel post script for Instagram — 5 slides on our key benefits": `**Instagram Carousel: "5 Reasons to Choose Our Brand" (5 slides)**

---

**Slide 1 — Hook:**
Headline: "5 Reasons Our Brand Beats the Status Quo"
Visual: Customer using the product in a bright modern environment.
Caption hook: "You deserve a better experience. Swipe to see why →"

**Slide 2 — Reason 1:**
Headline: "⏱ No More Waiting"
Body: "The average person spends 2+ hours dealing with friction in this category. With our brand: get started in under 2 minutes."
Visual: Side-by-side — frustrated user vs. happy user.

**Slide 3 — Reason 2:**
Headline: "📍 Real-Time Updates"
Body: "Track your order like a delivery. You know exactly what's happening. No uncertainty, no wasted time."
Visual: Smartphone showing a status update screen.

**Slide 4 — Reason 3:**
Headline: "💳 Transparent Pricing"
Body: "Final price, upfront. No surge. No surprise charges. Pay what we say you'll pay."
Visual: Clean pricing card on a phone.

**Slide 5 — CTA:**
Headline: "Get Started Today"
Body: "Available in your city. Sign up in 2 minutes at example.com"
Visual: Bold brand visual with CTA. Brand logo prominent.
Caption: "Try it on your schedule. Link in bio. ✨ #YourBrand #GetStarted"

---
**Tip:** Post at 7–9 PM on weekdays. Save as a Canva template for rapid weekly use.`,

  "Write a Twitter/X thread (7 tweets) on why our product beats the status quo": `**Twitter/X Thread: "Why our brand beats the status quo" (7 tweets)**

---

**Tweet 1 (hook):**
🧵 The average person spends 2 hours dealing with friction in this category for what should take 15 minutes.

There's a better way. A thread on why our brand is the future of this space 👇

**Tweet 2:**
The maths:
• Old way: 45 min commute + 90 min wait + 15 min job + 45 min back = 3.5 hours
• Our brand: 2 min to sign up → done in 45 min total

Same outcome. 5x less time.

**Tweet 3:**
But it's not just time.

The old way is genuinely frustrating. You sit around with no information, no agency.

With our brand: zero friction. Your terms, your schedule.

For busy professionals, parents, and anyone who values their time — this matters enormously.

**Tweet 4:**
"But is the quality as good?"

Our partners are:
✅ Verified credentials
✅ Background-checked
✅ Trained on our standards
✅ 4.8★ rated by customers

The same quality you'd expect from leading providers — without the wait.

**Tweet 5:**
The tech makes it work:
→ Sign up in 2 minutes
→ Real-time tracking
→ Digital receipts in your inbox
→ Follow-up reminders built in

This category has never been this frictionless.

**Tweet 6:**
We're live in our priority markets today.

150+ verified partners. 1,240 active customers last month. 4.8★ average rating.

And we're just getting started.

**Tweet 7 (CTA):**
If you've ever lost half a day to the old way of doing this, try our brand.

Get started → example.com

(Your first order is 10% off right now) #YourBrand #GetStarted`,

  "Draft a WhatsApp re-engagement message for customers inactive 30 days": `**WhatsApp Re-engagement Message — 30-Day Inactive Customers**

---

*Hi [First Name]* 👋

It's been a while since your last order with us, and we wanted to check in.

Your needs don't wait for the right moment — and neither do we.

*Place an order this week and get 10% off* — no code needed, it's already in your account.

What we can help with:
✨ Our flagship offering
📦 Add-on services
👥 Group / family options
🤝 Partner referrals

Sign up in 2 minutes → example.com/start

Reply *START* and we'll send you a direct link. Or just tap the link above.

Thanks,
The team ✨

---
**Sending tip:** Send between 7–9 PM. Keep the list under 1,000/day for WhatsApp Business API compliance. Always use opt-in lists only.`,

  "Write a 60-second Reels script — partner day-in-the-life": `**60-Second Reels Script — Partner Day-in-the-Life**

---

**[0–3 sec] Hook (text on screen + voiceover):**
"I'm an independent operator in this city. Here's what my mornings look like now."

Visual: Partner checking phone, notifications popping up — "3 new orders today"

**[3–10 sec] The old way (B-roll + text)**
Text: "Before our brand → early morning setup, 3 customers by noon, spend afternoons on admin"
Visual: Empty workspace, paperwork, stressed expression

**[10–25 sec] Your way (action montage)**
Voiceover: "Now, I check the partner app over morning coffee. My day's already planned."
Visuals:
- App showing 5 orders
- Partner heading out, GPS tracking active
- Greeting a customer warmly
- Doing the work, taking notes on tablet
- Customer smiling, digital receipt sent

**[25–45 sec] The numbers (data overlay)**
Text animations:
"40+ orders last month"
"$0 spent on marketing"
"Payments auto-transferred"
"I set my own hours"

Voiceover: "I grew my customer base by 3x without spending a single dollar on ads."

**[45–55 sec] Human moment**
Voiceover: "But the best part? My customers actually thank me for showing up."
Visual: Customer thanking the partner. Genuine moment.

**[55–60 sec] CTA**
Text: "Join 150+ partners on our platform"
Subtext: "example.com/partners — Free to join, zero lock-in"
Music fades. Logo hold.

---
**Production notes:** Shoot vertical (9:16). Add captions for silent viewing. Use trending audio or original voiceover. Keep edits punchy — max 2-3 sec per clip.`,

  "Create an infographic brief: 'How Our Brand Works in 4 Steps'": `**Infographic Brief: "How Our Brand Works in 4 Steps"**

---

**Title:** How Our Brand Works in 4 Simple Steps

**Format:** Vertical infographic — Pinterest/Instagram (1000×1500 px, 2:3 ratio)
**Style:** Clean flat illustration, brand primary colour + white + accent green (#22C55E)

**Step 1 — "Open Our Brand"**
Icon: Smartphone with our app open
Caption: "Visit example.com or open the app. Choose what you need."

**Step 2 — "Pick Your Partner & Time"**
Icon: Calendar with a partner profile card
Caption: "Browse 150+ verified partners. Filter by category and availability. Sign up same-day or schedule ahead."

**Step 3 — "Track in Real Time"**
Icon: Map pin with avatar moving
Caption: "Track progress like a delivery. Get notified when something's about to happen."

**Step 4 — "Done + Receipt"**
Icon: Checkmark + digital receipt on a phone
Caption: "Your partner completes the work and sends a digital receipt within the hour. Follow-up plan included."

**Bottom CTA:**
"Get started at example.com · Available in your city"

---

**DALL-E 3 Visual Prompt:**
"A clean vertical infographic design with 4 steps for a modern consumer app. Flat illustration style. Step icons: smartphone, calendar/profile card, map with moving pin, receipt on phone. Brand primary colour and white palette, green accent for checkmarks. Minimal, modern, professional. 1000×1500 px."`,

  "Generate a DALL-E 3 prompt for a brand lifestyle Instagram square post": `**DALL-E 3 Prompt — Brand Lifestyle Instagram Square Post**

---

**Full prompt:**

"Photorealistic image of a friendly customer using our brand's app on a smartphone in a bright, modern living room. Customer — a young urban professional, early 30s — is smiling warmly. Natural daylight, warm interior lighting. Clean composition, shallow depth of field with soft bokeh background. Brand colour palette. No text overlay. Square format 1:1, 1080×1080 pixels. High detail, DSLR quality, 8K resolution."

---

**Variations to test:**

**Variation A — Lifestyle scene:**
"Photorealistic photo of two people enjoying the brand experience together in a bright modern setting. They look relaxed and engaged. Warm natural light from a nearby window. Clean and modern home environment. Brand colour accents. 1:1 square format, 1080×1080."

**Variation B — Minimalist brand visual:**
"Minimalist flat illustration of a smartphone showing our brand app, clean geometric shapes, brand primary colour and white palette, no text, 1:1 square, suitable for Instagram grid."

---
**Tip:** Generate all 3 variations and A/B test in Meta Ads Manager. The photorealistic lifestyle scene typically outperforms in customer-acquisition campaigns by 15–25% CTR.`,
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
    return 'photorealistic lifestyle scene of a young urban professional using a smartphone in a bright modern living room, warm natural daylight, soft bokeh background, premium consumer brand aesthetic, 8K DSLR quality';
  }

  // Infographic
  if (msg.includes('infographic') || msg.includes('how it works') || msg.includes('4 steps') || msg.includes('four steps')) {
    return 'clean modern infographic showing four steps to get started with a consumer app, flat illustration style, brand primary colour and white, numbered step icons, modern minimalist design, vertical format';
  }

  // Carousel / slides
  if (msg.includes('carousel') || msg.includes('slides') || msg.includes('swipe')) {
    return 'Instagram carousel opening slide, happy customer using a modern app in a bright environment, warm welcoming scene, brand colour palette, photorealistic lifestyle photography';
  }

  // Reels / short video thumbnail
  if (msg.includes('reel') || msg.includes('tiktok') || msg.includes('short video') || msg.includes('day-in-the-life')) {
    return 'vertical social media visual for a modern brand, smiling person using a smartphone in a bright modern setting, warm cinematic lighting, mobile-first 9:16 composition, high quality';
  }

  // Platform-specific posts
  if (msg.includes('instagram')) {
    return 'Instagram square social media post for a modern consumer brand, lifestyle photography of customer using product, warm natural lighting, photorealistic, 1:1 format, high quality';
  }
  if (msg.includes('linkedin')) {
    return 'LinkedIn post image for a modern brand, professional lifestyle in a bright modern setting, blue and white corporate tones, trustworthy and clean, landscape format';
  }
  if (msg.includes('facebook')) {
    return 'Facebook post visual for a modern brand, warm customer-product lifestyle scene, inviting photography, brand blue and white, high quality';
  }
  if (msg.includes('twitter') || msg.includes('thread') || msg.includes('tweet') || msg.includes(' x ')) {
    return 'Twitter/X header visual for a modern brand, lifestyle scene, clean modern composition, blue and white brand palette, 16:9 landscape';
  }
  if (msg.includes('whatsapp')) {
    return 'WhatsApp marketing visual for a modern brand, friendly person with phone notification, warm brand colors, square format, photorealistic';
  }
  if (msg.includes('youtube') || msg.includes('thumbnail')) {
    return 'YouTube thumbnail for a modern brand, high contrast bold composition, cinematic quality, expressive scene, 16:9 format';
  }

  // Channel / format specific creatives
  if (msg.includes('google') || msg.includes('search ad') || msg.includes('ppc')) {
    return 'Google search ad creative for a modern brand, clean lifestyle scene of customer using product, professional photography, brand blue and white, landscape composition';
  }
  if (msg.includes('email') || msg.includes('onboarding') || msg.includes('newsletter')) {
    return 'email header banner for a modern brand, warm welcoming lifestyle scene, natural lighting, clean editorial composition, wide landscape format';
  }
  if (msg.includes('seo') || msg.includes('blog') || msg.includes('article')) {
    return 'editorial blog hero image for a modern brand, warm photojournalistic style, soft natural light, wide landscape composition, high quality';
  }
  if (msg.includes('recruit') || msg.includes('partner') || msg.includes('hire')) {
    return 'professional photograph of a confident independent operator smiling at camera in a modern bright environment, premium recruitment marketing visual, brand blue accents, photorealistic';
  }
  if (msg.includes('ad copy') || msg.includes('ad creative') || msg.includes('campaign')) {
    return 'premium ad creative for a modern brand, customer using the product, warm cinematic lighting, brand blue and white palette, high-converting lifestyle photography';
  }

  // Strategy / analytics / generic chat → still ship a brand visual
  if (msg.includes('budget') || msg.includes('allocat') || msg.includes('spend')) {
    return 'modern marketing dashboard visualization for a brand, clean charts and growth graphs, blue and white color palette, minimal editorial illustration style';
  }
  if (msg.includes('retention') || msg.includes('churn') || msg.includes('lifecycle')) {
    return 'editorial illustration of a customer lifecycle journey, clean modern flat design, blue and white palette, friendly connection icons';
  }

  // Default fallback — every message gets a high-quality brand visual
  return 'professional social media marketing visual for a modern brand, warm photorealistic lifestyle scene, brand colour accents, premium quality';
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
    return `Based on a moderate monthly budget and your current stage (early growth), here's my recommended allocation:

**60% → Google Search**
Highest-intent channel. Customers actively searching for what we offer. Start with exact match on your top 10 transactional keywords.

**25% → Meta**
Split: 60% awareness (customer story video), 40% retargeting (non-completions). Meta is a trust-builder, not a direct response channel at this stage.

**10% → Content / SEO**
Writer + freelance budget for 4 SEO articles/month and social media content. This compounds over time.

**5% → Experimental**
Test one new channel per quarter. LinkedIn for partner recruitment this quarter.

**Key rule:** Never let any single channel exceed 60% of budget until you have 3+ months of data proving it's sustainable.`;
  }

  if (lower.includes('retention') || lower.includes('churn')) {
    return `Your biggest retention risk right now is the **Day 7-30 drop-off**.

Current data shows:
• D7 retention: ~45% (acceptable)
• D30 retention: 22% (below 25% target)
• Gap: ~20pp of users who came back in week 1 don't return in month 1

**Root cause (most likely):** The post-first-order flow is too weak. Users complete a transaction but receive no next-step nudge to re-engage.

**What to fix first:**
1. **Day 7 post-order email:** "Recommended next step" — suggest a related service
2. **Day 14 push:** "Rate your last order" — reciprocity nudge
3. **Day 30 re-engagement:** personalised with their order history + a relevant reminder

This is a lifecycle fix, not an acquisition fix. Don't spend more on ads until D30 retention improves.`;
  }

  if (lower.includes('carousel') || lower.includes('slides') || lower.includes('swipe')) {
    return agentResponses["Create a carousel post script for Instagram — 5 slides on our key benefits"];
  }

  if ((lower.includes('twitter') || lower.includes('thread') || lower.includes('tweet')) && !lower.includes('ad')) {
    return agentResponses["Write a Twitter/X thread (7 tweets) on why our product beats the status quo"];
  }

  if (lower.includes('whatsapp') && (lower.includes('re-engage') || lower.includes('inactive') || lower.includes('reactivat'))) {
    return agentResponses["Draft a WhatsApp re-engagement message for customers inactive 30 days"];
  }

  if (lower.includes('reel') || lower.includes('video script') || lower.includes('short video')) {
    return agentResponses["Write a 60-second Reels script — partner day-in-the-life"];
  }

  if (lower.includes('infographic')) {
    return agentResponses["Create an infographic brief: 'How Our Brand Works in 4 Steps'"];
  }

  if (lower.includes('dall-e') || lower.includes('dalle') || lower.includes('visual prompt') || lower.includes('image prompt')) {
    return agentResponses["Generate a DALL-E 3 prompt for a brand lifestyle Instagram square post"];
  }

  if (lower.includes('this week') || lower.includes('focus') || lower.includes('priority')) {
    return `Here's what I'd focus on this week:

**🔴 Critical — Partner Supply**
Active partners at 148 vs 200 target. This is your #1 growth constraint. Launch the LinkedIn partner recruitment campaign today — I've already drafted the post, just use the one in your agent history or ask me to write a new one.

**🟡 At Risk — Day 3 Onboarding**
Signup → first order rate is 28% vs 35% target. Activate the Day 3 email A/B test this week. Ask me to write both variants.

**🟢 Quick Win — Referral CTA**
Referrals at 9% vs 15% target. A single CTA on the post-order confirmation screen could move this significantly. 1-day engineering task with high long-term ROI.

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
• Tailor every step to your brand's positioning and priority markets.

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

  return `Here's a starter answer for **"${trimmed}"** — tailored to your brand and current stage.

**Recommended structure:**
1. **Audience & intent** — who exactly is this for, and what are they trying to do right now?
2. **Core message** — the single most important thing to communicate (one sentence).
3. **Proof points** — 3 specific, credible reasons (verified partners, transparent pricing, fast turnaround, 4.8★ rating, 150+ partners, etc.).
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
• "best [category] service"
• "${competitor.toLowerCase()} price"

**URL:** \`/compare/${slugify(competitor)}-vs-yourbrand\`
**Title tag:** your brand vs ${competitor} — Which Wins in 2026?
**Meta description:** Compare your brand and ${competitor} on price, partner verification, turnaround and coverage. Independent side-by-side breakdown.

**Page sections (in order):**
1. **H1** — your brand vs ${competitor}: Side-by-Side
2. **TL;DR comparison table** — 6 rows: turnaround, price, partner verification, cities live, payment options, refund policy
3. **Who should pick which?** — 2 short paragraphs ("Pick your brand if…" / "Pick ${competitor} if…") — honest, not snarky
4. **Feature-by-feature breakdown** — 4–6 H2 sections, each with a 2-column table and 2-line summary
5. **Pricing comparison** — real examples for the most common use cases
6. **What real customers say** — 2 short verified quotes per side (no fabricated testimonials)
7. **FAQ schema block** — 5 Qs (price, coverage, refund, support, integrations) with FAQPage JSON-LD
8. **Bottom-of-funnel CTA** — "Get started in 2 minutes" with phone number + WhatsApp deep-link
9. **Related comparisons** — internal links to /compare/* siblings (programmatic-SEO hub)

**On-page SEO checklist:**
• Comparison schema (Product + Review) — ⚠️ avoid \`Review\` markup if you can't surface real reviews on-page (Google penalty risk).
• Internal link from /pricing, /how-it-works, and the city pages.
• 1 outbound link to ${competitor}'s homepage (rel="nofollow") — earns trust signals.
• Image alt text uses the literal query "${competitor.toLowerCase()} vs your brand".

**CRO levers (BoFU):**
• Sticky bottom bar on mobile with "Get started in 2 min — from $X in your city".
• Exit-intent overlay: "Not sure? Get a free 5-min consultation — free".
• Trust strip directly above the CTA: "150+ verified partners • 4.8★ • Refund guarantee".

Want me to expand any section into final copy, or generate the comparison table rows with concrete claims?`;
  }

  // ---- Landing page -----------------------------------------------------
  if (lower.includes('landing page') || lower.includes('lander') || lower.includes('squeeze page')) {
    return `**📄 Landing page draft for: "${prompt}"**

**Above the fold:**
• **H1:** [single benefit-led headline — verb + outcome + timeframe, e.g. "Get started in under 2 minutes"]
• **Subhead:** one line covering price, coverage, trust signal
• **Primary CTA button:** "Get started" (mobile-first, ≥48px, accent colour)
• **Hero visual:** customer using product in a bright modern setting (use Visual Generator)
• **Trust strip:** "150+ verified partners • Live in your city • 4.8★ on 12k orders"

**Section order (top → bottom):**
1. Hero (above)
2. **3 ICP-pain bullets** — what your brand fixes
3. **How it works — 4 steps** — sign up → match → deliver → pay (use the infographic brief)
4. **What's included** — service fee, receipt, follow-up if needed
5. **Social proof** — 3 short quotes + city + verified badge
6. **Pricing transparency block** — exact price for each tier, "no surge"
7. **Risk reversal** — "Refund if we don't deliver on time"
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
A) Get started in under 2 minutes
B) The most trusted brand in our category
C) Skip the friction. Try us today.

**Subhead:** Verified partners across our priority markets. Transparent pricing. Sign up in 2 minutes.

**Primary CTA:** Get started
**Secondary CTA:** See pricing in your city

**Below the fold (in order):**
1. **3-up "why our brand"** — Verified · Transparent · Fast
2. **How it works — 4 cards** — Sign up / Match / Deliver / Pay
3. **Services** — list your top categories (each links out)
4. **Cities live** — list your priority markets (clickable city pages)
5. **Trust block** — 150+ partners · 4.8★ · 12k orders
6. **Press / partners strip**
7. **Final CTA** — sticky mobile

**Tracking events:** \`hero_cta_click\`, \`city_select\`, \`pricing_view\`, \`signup_start\`, \`signup_complete\`.

Want full final copy for a specific variant (A / B / C)?`;
  }

  // ---- Pricing page -----------------------------------------------------
  if (lower.includes('pricing page') || lower.includes('pricing strategy') || lower.includes('plans page') || (lower.includes('pricing') && (lower.includes('page') || lower.includes('write')))) {
    return `**💰 Pricing page draft**

**Promise above the fold:** "Transparent pricing. No surge. No surprise charges."

**Layout:** 3-column comparison (Tier 1 / Tier 2 / Tier 3) — each column shows:
• City-level price (priority cities as tabs)
• What's included (service fee, receipt, follow-up window, refund window)
• Primary CTA — "Get started with [Tier 1]"

**Below the table:**
• **Add-ons** — supplementary services (link to those pages)
• **Enterprise & corporate** — single CTA for B2B partnerships
• **FAQ** — "Why these prices?", "Is there a cancellation fee?", "Do I pay before or after?", "Refund policy?"

**Conversion levers:**
• Show savings vs. competitor avg (use the comparison page data, no fabricated numbers).
• Add "Most popular in your city" badge on the busiest column.
• Sticky bottom CTA on mobile with the cheapest visible price.

**Schema:** \`Product\` + \`Offer\` per service, with \`priceCurrency\` and \`areaServed\`.

Want me to draft the actual price table rows or the FAQ copy in full?`;
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
**Primary keyword cluster:** [pull from Search Console / Ahrefs — e.g. "[primary service] in [city]", "[category] cost"].

**URL:** \`/blog/${slugify(prompt).slice(0, 60)}\`
**Title tag (≤60 chars):** [keyword] — [benefit] | your brand
**Meta description (≤155 chars):** Plain-English answer in one sentence + soft CTA.

**Outline (H2 / H3):**
1. **TL;DR** — 3-bullet answer block (so AI Overviews / featured snippets can lift it).
2. **What is [topic]?** — definition + when it's relevant.
3. **How it works step-by-step** — numbered list, screenshot-able.
4. **Cost in your market** — real price ranges per city.
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
C) [Number + benefit, e.g. "10% off your next order"]

**Preheader:** One-line value prop, 40–80 chars, doesn't repeat the subject.

**Body structure (≤120 words):**
1. **Hook** — one sentence connecting to a recent action or pain.
2. **Value** — 2–3 bullets of what they get.
3. **Single CTA** — button + plain-text link backup ("Get started →").
4. **PS** — soft trust signal ("Refund if we don't deliver on time").

**Send rules:**
• Tuesday or Thursday, 10:00 local time (open-rate sweet spot).
• Throttle: 1 marketing email per user per 72h.
• Suppress: anyone with an active order in the last 24h.

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
1. Get Started in 2 Minutes
2. Verified Partners Near You
3. Skip the Friction — Sign Up

**Descriptions (2 to test, ≤90 chars):**
A) Verified partners on demand. Transparent pricing. Sign up in 2 minutes.
B) Same-day service. 4.8★ rated. Refund if we don't deliver on time.

**Primary text / long copy (Meta / LinkedIn):**
Tired of friction in this category? Our brand connects you with a verified partner in under 2 minutes. Transparent pricing, real-time updates, 4.8★ from 12,000+ customers. Sign up in 2 minutes.

**CTA button:** Sign Up
**Landing page:** /start?utm_source=${platform.toLowerCase().replace(/[^a-z]/g, '')}&utm_medium=cpc&utm_campaign=[campaign]
**Targeting hint:** city = your priority cities, age 28–55, intent keywords ("[primary keyword] near me", "best [category]", "[category] online").

**Measurement:**
• Conversion event: \`signup_complete\`, value = order value.
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
[Bold contrarian statement OR a specific number, e.g. "We served 1,247 customers in your city last month. Here's what surprised us."]

**Body (3–5 short lines, one idea per line):**
• Concrete pain or insight
• Specific proof / data point
• What this means for the reader

**CTA (last line):**
"Get started → example.com" OR a question that drives comments.

**Hashtags (3–5, mix of broad + niche):** #brand #ondemand #yourcity #startup

**Visual:** square 1:1 (Instagram) / 1.91:1 (LinkedIn) — use the Visual Generator.

**Best post time:** Tue/Wed/Thu 09:30 or 19:00 local time.

Tell me the platform + content pillar (Education / Trust / Promo / Behind-the-scenes / Customer story / Partner story) and I'll write the final copy.`;
  }

  // ---- WhatsApp / SMS / push -------------------------------------------
  if (lower.includes('whatsapp') || lower.includes(' sms') || lower.includes('push notification') || lower.includes('push notif')) {
    const channel = lower.includes('whatsapp') ? 'WhatsApp' : lower.includes('sms') ? 'SMS' : 'Push';
    return `**💬 ${channel} draft for: "${prompt}"**

**Message (≤160 chars for SMS, ≤200 for ${channel}):**
"Hi [Name] — your last order with us was [N] days ago. Need anything today? Sign up in 2 min: [shortlink]. Reply STOP to opt out."

**Best practice:**
• Personalise with first name + last order detail (real data, never fabricated).
• Single shortlink with UTM (\`utm_source=${channel.toLowerCase()}&utm_medium=lifecycle\`).
• Send window: 10:00–19:00 local time. Never on Sunday before 11:00.
• Frequency cap: 1 message per user per 7 days for non-transactional.
• Always include opt-out (regulatory / WhatsApp policy compliance).

**Measurement:** delivered → clicked → ordered, attribute within 24h click window.

Want a 3-message sequence (day 0 / day 3 / day 7) or a single broadcast?`;
  }

  // ---- Feature page ----------------------------------------------------
  if (lower.includes('feature page') || lower.includes('product page')) {
    return `**🧩 Feature page draft for: "${prompt}"**

**Above the fold:**
• **H1:** [feature name] — [outcome it delivers]
• **Subhead:** one line covering who it's for + the headline benefit
• **Primary CTA:** Sign up / Try / See pricing
• **Visual:** product screenshot or lifestyle hero

**Sections:**
1. **The problem** — 1 short paragraph, name the pain literally
2. **How [feature] works** — 3-step illustrated breakdown
3. **What you get** — 4–6 concrete bullets (no marketing fluff)
4. **Who it's for** — 2–3 ICP cards (with city + use case)
5. **Proof** — 2 quotes + 1 number (e.g. "Avg turnaround: 27 min in your city")
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

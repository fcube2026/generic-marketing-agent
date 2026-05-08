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
  "Write Google Search ad copy for SIP investing in Mumbai",
  "Draft a LinkedIn post to pitch corporate financial wellness",
  "Write the Day 3 onboarding email",
  "Suggest 5 SEO article ideas for the personal-finance blog",
  "Create a carousel post script for Instagram — 5 slides on family budgeting",
  "Write a Twitter/X thread (7 tweets) on why most people fail at saving",
  "Draft a WhatsApp re-engagement message for members inactive 30 days",
  "Write a 60-second Reels script for your brand — member day-in-the-life",
  "Create an infographic brief: 'How your brand Works in 4 Steps'",
  "Generate a DALL-E 3 prompt for a family-budgeting Instagram square post",
  "How should I allocate my ₹5L marketing budget?",
  "What's my biggest retention risk right now?",
];

// Canned fallback responses used only when the OpenAI-backed /api/ai/chat
// route is unavailable (e.g. no OPENAI_API_KEY configured). When the LLM is
// healthy we always prefer its live reply.
const agentResponses: Record<string, string> = {
  "Write Google Search ad copy for SIP investing in Mumbai": `Here are 3 headline and description sets for Google Search — SIP investing in Mumbai:

**Headline Set A:**
• "Start Your SIP in 2 Minutes"
• "Track Every Goal — Invest Better"
• "SIPs Made Simple — Mumbai Members"

**Headline Set B:**
• "Your Family\u2019s Money, on Autopilot"
• "Mumbai\u2019s Trusted Money App — Start Free"
• "Plan, Save, Invest — All in One App"

**Description 1:**
your brand: budget, save and invest as a household. Bank-grade security, transparent pricing, 4.8★ rated by 12,000+ members.

**Description 2:**
SIPs and goal-based investing for Mumbai families. Set up in 2 minutes. Family-shared dashboards. Investments are subject to market risk.

**Recommendation:** Use "Start Your SIP in 2 Minutes" as your primary headline — a specific, low-friction promise drives higher CTR in personal-finance searches.`,

  "Draft a LinkedIn post to pitch corporate financial wellness": `Here's a LinkedIn post for B2B corporate financial-wellness pitches:

---

**👥 HR leaders in Mumbai, Delhi, and Bengaluru — your team\u2019s biggest stressor probably isn\u2019t work.**

It\u2019s money.

70% of Indian employees say financial stress hurts their productivity. Most "wellness" programs ignore it entirely.

We built your brand to fix that.

Here\u2019s how it works for your team:
→ Free family-finance app for every employee
→ Budgeting, saving and SIP tools — in plain English
→ Optional premium tier with goal-based investing and tax planning
→ Anonymous, aggregate insights for HR — never individual data

20+ companies are already running your brand as a benefit. Some have seen 30%+ adoption in the first 90 days.

Zero setup cost. No long contract. SOC 2 + DPDP compliant.

If financial wellness is on your 2026 roadmap, DM me or visit example.com/business.

#financialwellness #hr #employeebenefits #india

---

**Tip:** Post this yourself as a founder (not from the brand page) — personal posts drive 3x higher engagement on LinkedIn.`,

  "Write the Day 3 onboarding email": `**Day 3 Onboarding Email**

---
**Subject:** Your ₹100 is waiting — set up your first budget today

**Preview text:** Takes 2 minutes. Bank-grade security, transparent pricing.

---

Hi [First Name],

You signed up 3 days ago, and we noticed you haven\u2019t set up your first budget yet.

That\u2019s okay — we just don\u2019t want you to miss out.

**For the next 48 hours, your first month of premium is ₹100 off.**

No coupon needed. It\u2019s already in your account.

Here\u2019s what happens when you set up your budget:

1. Pick from 12 ready-made templates (or start from scratch)
2. Link your bank or upload a statement — your data stays private
3. Get personalised savings suggestions in under 2 minutes
4. Track your progress in real time, with your family if you choose

**[Set up your budget →]**

If you have questions, just reply to this email — we read every message.

Stay on top of your money,
Your team

---
**Tip:** Send this at 8 PM local time — highest email open rates for personal-finance in India are 7–9 PM.`,

  "Suggest 5 SEO article ideas for the personal-finance blog": `Here are 5 high-priority SEO article ideas, ranked by traffic + conversion potential:

**1. "Best Budgeting Apps in India 2026: A Member-Backed Comparison" (2,500 words)**
→ Target keyword: "best budgeting app india" (5,400/mo)
→ Type: Transactional / informational hybrid
→ CTA: Sign up free

**2. "10 Signs You Need a Budget Today (And How to Build One in 5 Minutes)" (1,800 words)**
→ Target keyword: "how to make a budget" (8,900/mo)
→ Type: Informational / problem awareness
→ CTA: Start your free budget

**3. "SIP Calculator: How Much to Invest Each Month for Your Goals" (2,000 words)**
→ Target keyword: "sip calculator" (4,800/mo)
→ Type: Calculator + transactional
→ CTA: Start a SIP in 2 minutes

**4. "your brand vs Competitor A: Which Is Better for Family Finance?" (1,500 words)**
→ Target keyword: "your brand vs competitor a" + "competitor a alternative" (1,980/mo combined)
→ Type: Comparison
→ CTA: Try your brand free

**5. "Family Finance: A Parent\u2019s Guide to Budgeting With Kids and Joint Goals" (2,200 words)**
→ Target keyword: "family budget planner" (2,600/mo)
→ Type: Parent-focused informational
→ CTA: Start a family circle

Start with article 1 — it has the highest direct signup intent.`,

  "Create a carousel post script for Instagram — 5 slides on family budgeting": `**Instagram Carousel: "5 Reasons Most Indian Families Fail at Budgeting" (5 slides)**

---

**Slide 1 — Hook:**
Headline: "5 Reasons Most Indian Families Fail at Budgeting"
Visual: A relaxed family at a kitchen table reviewing a phone together, warm natural light.
Caption hook: "You earn well — but does it feel like the money disappears? Swipe →"

**Slide 2 — Reason 1:**
Headline: "📒 They Track AFTER Spending, Not Before"
Body: "By the time you check the bank app, the money\u2019s already gone. Plan-then-spend beats spend-then-regret every single month."
Visual: Side-by-side — chaotic receipts pile vs. a clean monthly plan on a phone.

**Slide 3 — Reason 2:**
Headline: "📊 They Budget Solo"
Body: "When only one partner sees the numbers, the other can\u2019t help. A shared family dashboard turns money from a fight into a team game."
Visual: Two people looking at the same dashboard on a tablet.

**Slide 4 — Reason 3:**
Headline: "🎯 They Save Without a Goal"
Body: "Saving \u201cin general\u201d almost never sticks. Saving for \u201cBengaluru trip in March\u201d does. Goal-based saving wins every time."
Visual: A goal card showing progress to ₹50,000 for a family trip.

**Slide 5 — CTA:**
Headline: "Take Control of Your Family\u2019s Money"
Body: "Set up your first family budget in 2 minutes. Free forever. Premium from ₹199/month."
Visual: Bold brand visual with signup CTA. your brand\u2019s logo prominent.
Caption: "Your money, your rules. Link in bio. 💸 #FamilyFinance #YourBrand #PersonalFinance"

---
**Tip:** Post at 7–9 PM on weekdays. Save as a Canva template for rapid weekly use.`,

  "Write a Twitter/X thread (7 tweets) on why most people fail at saving": `**Twitter/X Thread: "Why most people fail at saving" (7 tweets)**

---

**Tweet 1 (hook):**
🧵 9 out of 10 Indian salaried professionals tell us they want to save more.

Less than 2 in 10 actually do.

A thread on why — and how to flip it 👇

**Tweet 2:**
The maths most people get wrong:
• Income → spend → save what\u2019s left = almost always ₹0
• Income → save first → spend what\u2019s left = a real cushion every month

Same income. Different order. Wildly different result.

**Tweet 3:**
But it\u2019s not just behaviour.

Most people save \u201cin general\u201d — no name, no number, no deadline. So when life happens, the saving is the first thing to go.

A goal with a name (\u201cParents\u2019 anniversary trip — ₹80k by Dec\u201d) survives the first crisis. \u201cSavings\u201d does not.

**Tweet 4:**
\u201cBut what about investing?\u201d

For most salaried folks, a simple boring SIP into a diversified index fund beats almost everything.
✅ Auto-debited
✅ Rupee-cost averaging
✅ Compounds quietly while you live your life

Investments are subject to market risk — but doing nothing is the bigger one.

**Tweet 5:**
The tech makes it work:
→ Set a goal in 2 minutes
→ Auto-debit on salary day
→ Family circle to keep each other honest
→ Insights that don\u2019t require a finance degree

Saving has never been this frictionless.

**Tweet 6:**
We\u2019re live across India.

12,000+ members. ₹4.2 crore saved by them last quarter alone. 4.8★ average rating.

And we\u2019re just getting started.

**Tweet 7 (CTA):**
If \u201csave more\u201d has been on your list for 3 years, try your brand for one month.

Set up your first goal → example.com

(First month is ₹100 off right now) #PersonalFinance #SIP #YourBrand`,

  "Draft a WhatsApp re-engagement message for members inactive 30 days": `**WhatsApp Re-engagement Message — 30-Day Inactive Members**

---

*Hi [First Name]* 👋

It\u2019s been a while since you last opened your brand, and we wanted to check in.

Your money goals don\u2019t wait for the right moment — and neither do we.

*Set up a budget or goal this week and get ₹100 off your first month of premium* — no code needed, it\u2019s already in your account.

What we can help with:
💸 Monthly budgeting in 2 minutes
🎯 Goal-based saving (trip, emergency fund, EMI)
📈 Start a SIP — auto-debited
👨\u200d👩\u200d👧 Family circles for shared goals

Open the app → example.com/app

Reply *START* and we\u2019ll send you a direct link. Or just tap above.

Stay on top of your money,
Team your brand 💚

---
**Sending tip:** Send between 7–9 PM. Keep the list under 1,000/day for WhatsApp Business API compliance. Always use opt-in lists only.`,

  "Write a 60-second Reels script for your brand — member day-in-the-life": `**60-Second Reels Script — Member Day-in-the-Life**

---

**[0–3 sec] Hook (text on screen + voiceover):**
"I\u2019m 31, salaried, in Mumbai. Here\u2019s how my month with money looks now."

Visual: Member checking phone, notifications popping up — "SIP debited · Goal +₹5,000"

**[3–10 sec] The old way (B-roll + text)**
Text: "Before your brand → salary in, EMIs out, ₹0 left by the 25th, no idea where it went"
Visual: Cluttered desk, scattered receipts, late-night stressed scrolling

**[10–25 sec] The new way (action montage)**
Voiceover: "Now, I open your brand over morning chai. My month\u2019s already planned."
Visuals:
- App showing this month\u2019s budget categories
- Goal screen — \u201cParents\u2019 anniversary trip · 60% there\u201d
- Auto-debit notification on salary day
- Family-circle screen with partner reviewing together
- A small celebration when a category stays under budget

**[25–45 sec] The numbers (data overlay)**
Text animations:
"Saved ₹62,000 in 6 months"
"Started my first SIP"
"No more end-of-month panic"
"My partner and I finally agree on money"

Voiceover: "I tripled what I save — without earning a single rupee more."

**[45–55 sec] Human moment**
Voiceover: "But the best part? My family talks about money like a team now. Not a fight."
Visual: Couple high-fiving over a hit goal milestone on the phone. Genuine moment.

**[55–60 sec] CTA**
Text: "Join 12,000+ members on your platform"
Subtext: "example.com — Free forever, premium from ₹199/month"
Music fades. Logo hold.

---
**Production notes:** Shoot vertical (9:16). Add captions for silent viewing. Use trending audio or original voiceover. Keep edits punchy — max 2-3 sec per clip.`,

  "Create an infographic brief: 'How your brand Works in 4 Steps'": `**Infographic Brief: "How your brand Works in 4 Steps"**

---

**Title:** How your brand Works in 4 Simple Steps

**Format:** Vertical infographic — Pinterest/Instagram (1000×1500 px, 2:3 ratio)
**Style:** Clean flat illustration, finance navy (#0F2A5F) + white + accent green (#22C55E)

**Step 1 — "Open your brand"**
Icon: Smartphone with your brand app open
Caption: "Visit example.com or open the app. Pick what you want to start with: budget, goal, or SIP."

**Step 2 — "Set Up Your First Plan"**
Icon: Budget categories card
Caption: "Choose from 12 ready-made budgets or build your own. Add household members to your family circle if you like."

**Step 3 — "Auto-Track in Real Time"**
Icon: Linked bank account with live balance
Caption: "Securely link an account or upload a statement. Your spending sorts itself, every day. Bank-grade security."

**Step 4 — "Save, Invest, Repeat"**
Icon: Goal progress bar + SIP icon
Caption: "Auto-debit on salary day. Watch your goals fund themselves. Tax-saving + premium tools available when you\u2019re ready."

**Bottom CTA:**
"Start your first budget at example.com · Free forever · Available across India"

---

**DALL-E 3 Visual Prompt:**
"A clean vertical infographic design with 4 steps for a personal-finance app. Flat illustration style. Step icons: smartphone, budget categories card, linked bank account with live balance, goal progress with SIP. Finance navy (#0F2A5F) and white colour palette, green accent for completed steps. Minimal, modern, professional. 1000×1500 px."`,

  "Generate a DALL-E 3 prompt for a family-budgeting Instagram square post": `**DALL-E 3 Prompt — Family Budgeting Instagram Square Post**

---

**Full prompt:**

"Photorealistic image of a relaxed Indian couple in their early 30s sitting at a bright modern kitchen table, reviewing a finance app together on a smartphone. Coffee cups, a notebook, and a small plant on the table. Natural daylight, warm interior lighting. Both look engaged and slightly smiling — a calm, in-control money moment. Clean composition, shallow depth of field with soft bokeh background. Finance navy and white tones. No text overlay. Square format 1:1, 1080×1080 pixels. High detail, DSLR quality, 8K resolution."

---

**Variations to test:**

**Variation A — Goal moment:**
"Photorealistic photo of a young Indian professional sitting on a sofa, smiling at a phone showing a goal-progress screen at 100%. Bright modern living room, warm natural light from a nearby window. Clean and modern home environment. Finance navy accents. 1:1 square format, 1080×1080."

**Variation B — Minimalist brand visual:**
"Minimalist flat illustration of a phone screen showing a clean monthly budget with categories and a savings goal at 60%. Simple line icons, finance navy (#0F2A5F) and white colour palette, accent green for the saved portion, no text, 1:1 square, suitable for Instagram grid."
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
    return 'photorealistic young Indian couple at a bright modern kitchen table reviewing a personal-finance app on a smartphone together, calm and in-control money moment, warm natural daylight, shallow depth of field, 8K DSLR quality';
  }

  // Infographic
  if (msg.includes('infographic') || msg.includes('how it works') || msg.includes('4 steps') || msg.includes('four steps')) {
    return 'clean personal-finance infographic showing four steps to set up a budget and start a SIP, flat illustration style, finance navy and white, numbered step icons, modern minimalist design, vertical format';
  }

  // Carousel / slides
  if (msg.includes('carousel') || msg.includes('slides') || msg.includes('swipe')) {
    return 'Instagram carousel opening slide, Indian family reviewing a budget on a phone in a bright modern home, warm welcoming scene, finance navy and white, photorealistic lifestyle photography';
  }

  // Reels / short video thumbnail
  if (msg.includes('reel') || msg.includes('tiktok') || msg.includes('short video') || msg.includes('day-in-the-life')) {
    return 'vertical social media visual for personal-finance brand, smiling young Indian professional checking goal progress on a phone, warm cinematic lighting, mobile-first 9:16 composition, high quality';
  }

  // Platform-specific posts
  if (msg.includes('instagram')) {
    return 'Instagram square social media post for personal-finance brand your brand, family budgeting lifestyle photography, warm natural lighting, photorealistic, 1:1 format, high quality';
  }
  if (msg.includes('linkedin')) {
    return 'LinkedIn post image for personal-finance brand, professional young Indian leader in a modern bright workspace, navy and white corporate tones, trustworthy and clean, landscape format';
  }
  if (msg.includes('facebook')) {
    return 'Facebook post visual for personal-finance brand, warm family-money-moment scene, inviting lifestyle photography, brand navy and white, high quality';
  }
  if (msg.includes('twitter') || msg.includes('thread') || msg.includes('tweet') || msg.includes(' x ')) {
    return 'Twitter/X header visual for personal-finance brand your brand, modern dashboard with goal progress on a phone, clean modern composition, navy and white brand palette, 16:9 landscape';
  }
  if (msg.includes('whatsapp')) {
    return 'WhatsApp marketing visual for personal-finance brand your brand, friendly notification on phone showing a SIP debit and goal milestone, warm brand colors, square format, photorealistic';
  }
  if (msg.includes('youtube') || msg.includes('thumbnail')) {
    return 'YouTube thumbnail, personal-finance app your brand, high contrast bold composition with a stand-out money insight, cinematic quality, expressive scene, 16:9 format';
  }

  // Channel / format specific creatives
  if (msg.includes('google') || msg.includes('search ad') || msg.includes('ppc')) {
    return 'Google search ad creative for personal-finance brand your brand, clean modern young Indian member using the budgeting app, professional lifestyle photography, finance navy and white, landscape composition';
  }
  if (msg.includes('email') || msg.includes('onboarding') || msg.includes('newsletter')) {
    return 'email header banner for personal-finance brand your brand, friendly couple reviewing a budget on a phone in a sunlit kitchen, warm natural lighting, clean editorial composition, wide landscape format';
  }
  if (msg.includes('seo') || msg.includes('blog') || msg.includes('article')) {
    return 'editorial blog hero image for personal-finance brand your brand, member calmly planning monthly money with a phone and notebook, warm photojournalistic style, soft natural light, wide landscape composition, high quality';
  }
  if (msg.includes('recruit') || msg.includes('hr') || msg.includes('corporate') || msg.includes('hire')) {
    return 'professional photograph of a confident HR leader in a modern bright office discussing employee financial wellness, premium B2B marketing visual, navy accents, photorealistic';
  }
  if (msg.includes('ad copy') || msg.includes('ad creative') || msg.includes('campaign')) {
    return 'premium ad creative for personal-finance brand your brand, family-money-moment scene at a kitchen table with a phone, warm cinematic lighting, brand navy and white palette, high-converting lifestyle photography';
  }

  // Strategy / analytics / generic chat → still ship a brand visual
  if (msg.includes('budget') || msg.includes('allocat') || msg.includes('spend')) {
    return 'modern marketing dashboard visualization for personal-finance brand your brand, clean charts and growth graphs, navy and white color palette, minimal editorial illustration style';
  }
  if (msg.includes('retention') || msg.includes('churn') || msg.includes('lifecycle')) {
    return 'editorial illustration of member lifecycle journey for personal-finance brand your brand, clean modern flat design, navy and white palette, friendly money-goal and progress icons';
  }

  // Default fallback — every message gets a high-quality brand visual
  return 'professional social media marketing visual for personal-finance brand your brand, family reviewing a budget on a phone at home, warm photorealistic scene, finance navy accents, premium quality';
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
Highest-intent channel. Members actively searching for budgeting and SIP tools. Start with exact match on your top 10 transactional keywords.

**25% → Meta (₹1,25,000)**
Split: 60% awareness (member story video), 40% retargeting (signup non-completions). Meta is a trust-builder, not a direct-response channel at this stage.

**10% → Content / SEO (₹50,000)**
Writer + freelance budget for 4 SEO articles/month and social media content. This compounds over time.

**5% → Experimental (₹25,000)**
Test one new channel per quarter. LinkedIn for B2B financial-wellness this quarter.

**Key rule:** Never let any single channel exceed 60% of budget until you have 3+ months of data proving it's sustainable.`;
  }

  if (lower.includes('retention') || lower.includes('churn')) {
    return `Your biggest retention risk right now is the **Day 7-30 drop-off**.

Current data shows:
• D7 retention: ~45% (acceptable)
• D30 retention: 22% (below 25% target)
• Gap: ~20pp of users who came back in week 1 don't return in month 1

**Root cause (most likely):** The post-first-budget flow is too weak. Members set up a budget but receive no next-step nudge to set a savings goal or start a SIP.

**What to fix first:**
1. **Day 7 post-budget email:** "Your first savings goal" — suggest a goal sized to what they\u2019re budgeting (e.g., 1-month emergency fund)
2. **Day 14 push:** "You\u2019re on track — start your first SIP in 2 minutes" — momentum nudge
3. **Day 30 re-engagement:** personalised with their spending insight + a tax-saving tip relevant to their income band

This is a lifecycle fix, not an acquisition fix. Don't spend more on ads until D30 retention improves.`;
  }

  if (lower.includes('carousel') || lower.includes('slides') || lower.includes('swipe')) {
    return agentResponses["Create a carousel post script for Instagram — 5 slides on family budgeting"];
  }

  if ((lower.includes('twitter') || lower.includes('thread') || lower.includes('tweet')) && !lower.includes('ad')) {
    return agentResponses["Write a Twitter/X thread (7 tweets) on why most people fail at saving"];
  }

  if (lower.includes('whatsapp') && (lower.includes('re-engage') || lower.includes('inactive') || lower.includes('reactivat'))) {
    return agentResponses["Draft a WhatsApp re-engagement message for members inactive 30 days"];
  }

  if (lower.includes('reel') || lower.includes('video script') || lower.includes('short video')) {
    return agentResponses["Write a 60-second Reels script for your brand — member day-in-the-life"];
  }

  if (lower.includes('infographic')) {
    return agentResponses["Create an infographic brief: 'How your brand Works in 4 Steps'"];
  }

  if (lower.includes('dall-e') || lower.includes('dalle') || lower.includes('visual prompt') || lower.includes('image prompt')) {
    return agentResponses["Generate a DALL-E 3 prompt for a family-budgeting Instagram square post"];
  }

  if (lower.includes('this week') || lower.includes('focus') || lower.includes('priority')) {
    return `Here's what I'd focus on this week:

**🔴 Critical — Paid Subscription Conversion**
Active paid subscribers at 148 vs 200 target. This is your #1 revenue constraint. Launch the in-app upgrade nudge for members with 2+ active goals today — I\u2019ve already drafted the copy, just use the one in your agent history or ask me to write a new one.

**🟡 At Risk — Day 3 Onboarding**
Signup → first budget set up rate is 28% vs 35% target. Activate the Day 3 email A/B test this week. Ask me to write both variants.

**🟢 Quick Win — Referral CTA**
Referrals at 9% vs 15% target. A single CTA on the post-first-budget confirmation screen could move this significantly. 1-day engineering task with high long-term ROI.

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
• Tailor every step to your brand's personal-finance positioning across India.

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

  return `Here's a starter answer for **"${trimmed}"** — tailored to your brand (personal-finance app for individuals and families across India, early-growth stage, ₹5L/mo budget).

**Recommended structure:**
1. **Audience & intent** — who exactly is this for, and what are they trying to do right now?
2. **Core message** — the single most important thing to communicate (one sentence).
3. **Proof points** — 3 specific, credible reasons (bank-grade security, transparent pricing, set-up in 2 min, 4.8★ rating, 12,000+ members, etc.).
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
  // e.g. "Write your vs Acme comparison page optimised for SEO..."
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
• "best personal finance app india"
• "${competitor.toLowerCase()} subscription price"

**URL:** \`/compare/${slugify(competitor)}-vs-yourbrand\`
**Title tag:** your brand vs ${competitor} — Which Personal-Finance App Wins in 2026?
**Meta description:** Compare your brand and ${competitor} on price, security, features and coverage across India. Independent side-by-side breakdown.

**Page sections (in order):**
1. **H1** — your brand vs ${competitor}: Side-by-Side for Personal Finance
2. **TL;DR comparison table** — 6 rows: pricing (₹), security model, family/circle support, supported asset classes, payment options, refund policy
3. **Who should pick which?** — 2 short paragraphs ("Pick your brand if…" / "Pick ${competitor} if…") — honest, not snarky
4. **Feature-by-feature breakdown** — 4–6 H2 sections, each with a 2-column table and 2-line summary
5. **Pricing comparison** — real ₹ examples for free vs premium vs annual plans, plus add-ons
6. **What real members say** — 2 short verified quotes per side (no fabricated testimonials)
7. **FAQ schema block** — 5 Qs (price, security, refund, supported banks, tax) with FAQPage JSON-LD
8. **Bottom-of-funnel CTA** — "Set up your first budget in 2 minutes" with WhatsApp deep-link
9. **Related comparisons** — internal links to /compare/* siblings (programmatic-SEO hub)

**On-page SEO checklist:**
• Comparison schema (Product + Review) — ⚠️ avoid \`Review\` markup if you can't surface real reviews on-page (Google penalty risk).
• Internal link from /pricing, /how-it-works, and the city pages.
• 1 outbound link to ${competitor}'s homepage (rel="nofollow") — earns trust signals.
• Image alt text uses the literal query "${competitor.toLowerCase()} vs your brand".

**CRO levers (BoFU):**
• Sticky bottom bar on mobile with "Start in 2 min — free forever, premium from ₹X/month".
• Exit-intent overlay: "Not sure? Get a free 5-min call with a money coach — ₹0".
• Trust strip directly above the CTA: "Bank-grade security • 4.8★ • 7-day refund on premium".

Want me to expand any section into final copy, or generate the comparison table rows with concrete claims?`;
  }

  // ---- Landing page -----------------------------------------------------
  if (lower.includes('landing page') || lower.includes('lander') || lower.includes('squeeze page')) {
    return `**📄 Landing page draft for: "${prompt}"**

**Above the fold:**
• **H1:** [single benefit-led headline — verb + outcome + timeframe, e.g. "Set up your first budget in 2 minutes"]
• **Subhead:** one line covering price, coverage, trust signal
• **Primary CTA button:** "Book in 2 min" (mobile-first, ≥48px, accent colour)
• **Hero visual:** family reviewing a budget on a phone at the kitchen table, warm/natural lighting (use Visual Generator)
• **Trust strip:** "Bank-grade security • Available across India • 4.8★ from 12,000+ members"

**Section order (top → bottom):**
1. Hero (above)
2. **3 ICP-pain bullets** — what your brand fixes (no plan, money disappears mid-month, family money fights)
3. **How it works — 4 steps** — book → match → arrive → pay (use the infographic brief)
4. **What's included** — budgets, goals, family circle, optional SIP / tax tools
5. **Social proof** — 3 short quotes + city + verified badge
6. **Pricing transparency block** — exact ₹ for monthly / annual / family plans, "no hidden fees"
7. **Risk reversal** — "7-day money-back on premium, cancel anytime"
8. **FAQ** (6–8 questions, FAQPage schema)
9. **Final CTA repeat** — sticky on mobile

**Conversion checklist:**
• One CTA per screen, same colour, same wording.
• Form ≤3 fields (phone, city, primary goal). Phone-only "instant call back" variant for a/b test.
• Page weight <300KB above-the-fold; LCP <2.5s on 4G.
• Track: scroll depth 25/50/75/100, CTA click, form submit, phone-tap, WhatsApp-tap.

Tell me the channel this LP is for (Google Search / Meta cold / WhatsApp blast / SEO) and I'll tailor headline, proof, and offer accordingly.`;
  }

  // ---- Homepage / hero section -----------------------------------------
  if (lower.includes('homepage') || lower.includes('home page') || lower.includes('hero section') || lower.includes('hero copy')) {
    return `**🏠 Homepage / hero draft**

**Hero H1 (3 options to A/B):**
A) Set up your first budget in 2 minutes
B) India's most trusted personal-finance app
C) Stop end-of-month panic. Plan your money today.

**Subhead:** Budgeting, goals and SIPs for individuals and families across India. Bank-grade security. Set up in 2 minutes.

**Primary CTA:** Start free
**Secondary CTA:** See pricing

**Below the fold (in order):**
1. **3-up "why your brand"** — Secure · Transparent · Family-first
2. **How it works — 4 cards** — Sign up / Set budget / Track / Save & invest
3. **Features** — Budgets, Goals, Family Circle, SIP & Investing (each links out)
4. **Cities live** — Mumbai, Delhi, Bengaluru, Hyderabad (clickable city pages)
5. **Trust block** — 12,000+ members · 4.8★ · ₹4.2 cr saved last quarter
6. **Press / partners strip**
7. **Final CTA** — sticky mobile

**Tracking events:** \`hero_cta_click\`, \`city_select\`, \`pricing_view\`, \`signup_start\`, \`paid_subscription_started\`.

Want full final copy for a specific variant (A / B / C)?`;
  }

  // ---- Pricing page -----------------------------------------------------
  if (lower.includes('pricing page') || lower.includes('pricing strategy') || lower.includes('plans page') || (lower.includes('pricing') && (lower.includes('page') || lower.includes('write')))) {
    return `**💰 Pricing page draft**

**Promise above the fold:** "Transparent ₹ pricing. No hidden fees. Cancel anytime."

**Layout:** 3-column comparison (Free / Premium / Family) — each column shows:
• Monthly + annual ₹ (annual savings highlighted)
• What's included (budgets, goals, SIP, tax tools, support tier, refund window)
• Primary CTA — "Start [Free/Premium/Family]"

**Below the table:**
• **Add-ons** — premium tax filing, financial-advisor consult (link to those pages)
• **Corporate** — single CTA for HR / employee financial-wellness partnerships
• **FAQ** — "Why these prices?", "Is there a cancellation fee?", "Do I pay before or after?", "Refund policy?"

**Conversion levers:**
• Show savings vs. competitor avg (use the comparison page data, no fabricated numbers).
• Add "Most chosen by families" badge on the busiest column.
• Sticky bottom CTA on mobile with the cheapest visible price.

**Schema:** \`Product\` + \`Offer\` per plan, with \`priceCurrency: INR\` and \`areaServed\`.

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
**Primary keyword cluster:** [pull from Search Console / Ahrefs — e.g. "best budgeting app india", "sip calculator"].

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
C) [Number + benefit, e.g. "₹X off your first month of premium"]

**Preheader:** One-line value prop, 40–80 chars, doesn't repeat the subject.

**Body structure (≤120 words):**
1. **Hook** — one sentence connecting to a recent action or pain.
2. **Value** — 2–3 bullets of what they get.
3. **Single CTA** — button + plain-text link backup ("Open your brand →").
4. **PS** — soft trust signal ("7-day refund on premium, cancel anytime").

**Send rules:**
• Tuesday or Thursday, 10:00 IST (India open-rate sweet spot).
• Throttle: 1 marketing email per user per 72h.
• Suppress: anyone who completed onboarding in the last 24h.

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
1. Set Up a Budget in 2 Min
2. Trusted by 12k+ Members
3. Plan Your Money — Start Free

**Descriptions (2 to test, ≤90 chars):**
A) Budget, save and invest as a family. Bank-grade security. Set up in 2 minutes.
B) 12,000+ members. 4.8★ rated. 7-day refund on premium.

**Primary text / long copy (Meta / LinkedIn):**
Tired of money disappearing by the 25th? your brand helps you budget, save and invest as a family — across India. Bank-grade security, transparent pricing, 4.8★ from 12,000+ members. Set up in 2 minutes.

**CTA button:** Start Free
**Landing page:** /signup?utm_source=${platform.toLowerCase().replace(/[^a-z]/g, '')}&utm_medium=cpc&utm_campaign=[campaign]
**Targeting hint:** city = Mumbai/Delhi/Bengaluru/Hyderabad, age 25–45, intent keywords ("budgeting app", "sip calculator", "personal finance app").

**Measurement:**
• Conversion event: \`paid_subscription_started\`, value = subscription ARPU in INR.
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
[Bold contrarian statement OR a specific number, e.g. "Our 12,000 members saved ₹4.2 crore last quarter. Here's what surprised us."]

**Body (3–5 short lines, one idea per line):**
• Concrete pain or insight
• Specific proof / data point
• What this means for the reader

**CTA (last line):**
"Set up your budget → example.com" OR a question that drives comments.

**Hashtags (3–5, mix of broad + niche):** #personalfinance #moneytipsindia #sipinvesting #fintechindia

**Visual:** square 1:1 (Instagram) / 1.91:1 (LinkedIn) — use the Visual Generator.

**Best post time (India):** Tue/Wed/Thu 09:30 or 19:00 IST.

Tell me the platform + content pillar (Education / Trust / Promo / Behind-the-scenes / Member story / Founder story) and I'll write the final copy.`;
  }

  // ---- WhatsApp / SMS / push -------------------------------------------
  if (lower.includes('whatsapp') || lower.includes(' sms') || lower.includes('push notification') || lower.includes('push notif')) {
    const channel = lower.includes('whatsapp') ? 'WhatsApp' : lower.includes('sms') ? 'SMS' : 'Push';
    return `**💬 ${channel} draft for: "${prompt}"**

**Message (≤160 chars for SMS, ≤200 for ${channel}):**
"Hi [Name] — your last your brand check-in was [N] days ago. Take 2 min to update your budget: [shortlink]. Reply STOP to opt out."

**Best practice:**
• Personalise with first name + last in-app action (real data, never fabricated).
• Single shortlink with UTM (\`utm_source=${channel.toLowerCase()}&utm_medium=lifecycle\`).
• Send window: 10:00–19:00 IST. Never on Sunday before 11:00.
• Frequency cap: 1 message per user per 7 days for non-transactional.
• Always include opt-out (TRAI / WhatsApp policy compliance).

**Measurement:** delivered → clicked → activated, attribute within 24h click window.

Want a 3-message sequence (day 0 / day 3 / day 7) or a single broadcast?`;
  }

  // ---- Feature page ----------------------------------------------------
  if (lower.includes('feature page') || lower.includes('product page')) {
    return `**🧩 Feature page draft for: "${prompt}"**

**Above the fold:**
• **H1:** [feature name] — [outcome it delivers]
• **Subhead:** one line covering who it's for + the headline benefit
• **Primary CTA:** Start free / Try / See pricing
• **Visual:** product screenshot or lifestyle hero

**Sections:**
1. **The problem** — 1 short paragraph, name the pain literally
2. **How [feature] works** — 3-step illustrated breakdown
3. **What you get** — 4–6 concrete bullets (no marketing fluff)
4. **Who it's for** — 2–3 ICP cards (with city + use case)
5. **Proof** — 2 quotes + 1 number (e.g. "Avg setup time: 2 min")
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

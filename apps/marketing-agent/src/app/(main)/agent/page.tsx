'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { type AgentMessage } from '@/lib/data';
import { GeneratedImage } from '@/components/ui/GeneratedImage';

const suggestedPrompts = [
  "Write Google Search ad copy for home visits in Mumbai",
  "Draft a LinkedIn post to recruit providers",
  "Write the Day 3 onboarding email",
  "Suggest 5 SEO article ideas for the health blog",
  "Create a carousel post script for Instagram — 5 slides on home doctor benefits",
  "Write a Twitter/X thread (7 tweets) on why home visits beat clinic queues",
  "Draft a WhatsApp re-engagement message for patients inactive 30 days",
  "Write a 60-second Reels script for curex24 — provider day-in-the-life",
  "Create an infographic brief: 'How curex24 Works in 4 Steps'",
  "Generate a DALL-E 3 prompt for a home doctor visit Instagram square post",
  "How should I allocate my ₹5L marketing budget?",
  "What's my biggest retention risk right now?",
];

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
Curex24: trusted doctors at your doorstep in Mumbai. Book in 2 min, real-time tracking, transparent pricing. 4.8★ rated.

**Description 2:**
Home visits by verified doctors in Mumbai. Same-day appointments. Transparent pricing. Book online in minutes.

**Recommendation:** Use "Doctor at Home in 30 Minutes" as your primary headline — it has a specific time claim which drives higher CTR in healthcare searches.`,

  "Draft a LinkedIn post to recruit providers": `Here's a LinkedIn post for provider recruitment:

---

**👨‍⚕️ Independent doctors in Mumbai, Delhi, and Bengaluru — we built something for you.**

Running a solo practice means spending more time chasing patients than actually seeing them.

We built curex24 to flip that.

Here's how it works:
→ Patients book you directly on curex24
→ You get same-day notifications
→ You choose your hours and visit types
→ Payment lands in your account automatically

150+ verified doctors are already using curex24. Some are doing 40+ bookings a month.

Zero upfront cost. No lock-in.

If you want to grow your practice without growing your marketing budget, DM me or visit curex24.com/providers.

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
The curex24 team

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

**4. "Curex24 vs Practo: Which Is Better for Home Doctor Visits?" (1,500 words)**
→ Target keyword: "curex24 vs practo" + "practo alternative" (1,980/mo combined)
→ Type: Comparison
→ CTA: Try curex24 free

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
Body: "The average Indian patient spends 2+ hours in a clinic — 30 minutes seeing the doctor, 90+ minutes waiting. A curex24 home visit: doctor arrives in 30 minutes."
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
Body: "Available in Mumbai, Delhi & Bengaluru. Book in 2 minutes at curex24.com"
Visual: Bold brand visual with booking CTA. Curex24 logo prominent.
Caption: "Your health, on your schedule. Link in bio to book. 🏠 #HomeDoctor #curex24 #HealthTech"

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

curex24 doctors are:
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
If you've ever lost half a day to a clinic queue, try curex24 for your next appointment.

Book a home visit → curex24.com

(Your first visit is ₹100 off right now) #HomeDoctor #HealthTech #curex24`,

  "Draft a WhatsApp re-engagement message for patients inactive 30 days": `**WhatsApp Re-engagement Message — 30-Day Inactive Patients**

---

*Hi [First Name]* 👋

It's been a while since your last curex24 visit, and we wanted to check in.

Your health doesn't wait for the right moment — and neither do we.

*Book a home visit this week and get ₹100 off* — no code needed, it's already in your account.

What we can help with:
🩺 General consultation
💉 Diagnostics at home
👶 Paediatric visits
👴 Elderly care

Book in 2 minutes → curex24.com/book

Reply *BOOK* and we'll send you a direct link. Or just tap the link above.

Stay healthy,
Team curex24 🏥

---
**Sending tip:** Send between 7–9 PM. Keep the list under 1,000/day for WhatsApp Business API compliance. Always use opt-in lists only.`,

  "Write a 60-second Reels script for curex24 — provider day-in-the-life": `**60-Second Reels Script — Provider Day-in-the-Life**

---

**[0–3 sec] Hook (text on screen + voiceover):**
"I'm a doctor in Mumbai. Here's what my mornings look like now."

Visual: Doctor checking phone, notifications popping up — "3 new bookings today"

**[3–10 sec] The old way (B-roll + text)**
Text: "Before curex24 → 6 AM clinic setup, 3 patients by noon, spend afternoons on admin"
Visual: Empty clinic waiting room, paperwork, stressed expression

**[10–25 sec] The curex24 way (action montage)**
Voiceover: "Now, I check my curex24 app over morning chai. My day's already planned."
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
Text: "Join 150+ doctors on curex24"
Subtext: "curex24.com/providers — Free to join, zero lock-in"
Music fades. Logo hold.

---
**Production notes:** Shoot vertical (9:16). Add captions for silent viewing. Use trending audio or original voiceover. Keep edits punchy — max 2-3 sec per clip.`,

  "Create an infographic brief: 'How curex24 Works in 4 Steps'": `**Infographic Brief: "How curex24 Works in 4 Steps"**

---

**Title:** How curex24 Works in 4 Simple Steps

**Format:** Vertical infographic — Pinterest/Instagram (1000×1500 px, 2:3 ratio)
**Style:** Clean flat illustration, healthcare blue (#1E6FCC) + white + accent green (#22C55E)

**Step 1 — "Open curex24"**
Icon: Smartphone with curex24 app open
Caption: "Visit curex24.com or open the app. Choose your service: GP, specialist, or diagnostics."

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
"Book your home visit at curex24.com · Available in Mumbai, Delhi & Bengaluru"

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

const CREATION_KEYWORDS = ['generate', 'create', 'make', 'design', 'draft'];
const VISUAL_KEYWORDS = ['visual', 'image', 'picture', 'banner', 'graphic'];
const VISUAL_PLATFORMS = ['instagram', 'facebook', 'linkedin', 'social media'];

function getImagePromptForRequest(msg: string): string | null {
  // Explicit DALL-E / image prompt requests → always generate image
  if (msg.includes('dall-e') || msg.includes('dalle') || msg.includes('image prompt') || msg.includes('visual prompt')) {
    return 'photorealistic doctor in white coat arriving at modern apartment door, patient smiling and welcoming, bright natural daylight, warm interior lighting, compact medical kit, shallow depth of field, 8K DSLR quality';
  }

  // Infographic
  if (msg.includes('infographic')) {
    return 'clean healthcare infographic showing four steps to book a home doctor visit, flat illustration style, healthcare blue and white, numbered step icons, modern minimalist design, vertical format';
  }

  // Carousel / slides
  if (msg.includes('carousel') || (msg.includes('slides') && msg.includes('instagram'))) {
    return 'Instagram carousel opening slide, professional doctor visiting patient at home, warm welcoming scene, bright modern apartment, healthcare blue and white, photorealistic lifestyle photography';
  }

  // Reels / short video thumbnail
  if (msg.includes('reel') && CREATION_KEYWORDS.some((w) => msg.includes(w))) {
    return 'vertical social media visual for healthcare brand, smiling doctor in white coat at modern apartment door, warm cinematic lighting, mobile-first 9:16 composition, high quality';
  }

  // Post or visual generation requests for visual platforms
  const isCreating = CREATION_KEYWORDS.some((w) => msg.includes(w));
  const isVisualPost =
    VISUAL_KEYWORDS.some((w) => msg.includes(w)) ||
    (msg.includes('post') && VISUAL_PLATFORMS.some((p) => msg.includes(p)));

  if (!isCreating || !isVisualPost) return null;

  if (msg.includes('instagram')) {
    return 'Instagram square social media post for healthcare brand curex24, doctor home visit lifestyle photography, warm natural lighting, photorealistic, 1:1 format, high quality';
  }
  if (msg.includes('linkedin')) {
    return 'LinkedIn post image for healthcare brand, professional doctor in modern bright home setting, blue and white corporate tones, trustworthy and clean, landscape format';
  }
  if (msg.includes('facebook')) {
    return 'Facebook post visual for healthcare brand, warm doctor-patient home visit scene, inviting lifestyle photography, brand blue and white, high quality';
  }
  if (msg.includes('youtube') || msg.includes('thumbnail')) {
    return 'YouTube thumbnail, doctor home visit curex24, high contrast bold composition, cinematic quality, expressive scene, 16:9 format';
  }

  // Generic visual generation
  return 'professional social media marketing visual for healthcare brand curex24, doctor visiting patient at home, warm photorealistic scene, healthcare blue accents, premium quality';
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
    return agentResponses["Write a 60-second Reels script for curex24 — provider day-in-the-life"];
  }

  if (lower.includes('infographic')) {
    return agentResponses["Create an infographic brief: 'How curex24 Works in 4 Steps'"];
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

  return `I'd be happy to help with that. Based on curex24's current marketing position:

**Key context:**
• You're in early growth stage (1→10)
• Primary bottleneck: provider supply + D30 patient retention
• Budget: ₹5L/mo, 60% Google Search, 25% Meta
• Top performing: referrals and direct search intent

To give you the most targeted recommendation on "${trimmed}", I'd need a bit more context:
- Is this for patient acquisition, provider recruitment, or retention?
- Which city/market is your priority right now?
- What's your timeline?

Alternatively, try the **✨ Create Content** studio — it generates ready-to-publish posts, visual prompts, and full ad creatives for every platform. Or complete your **Intake** questionnaire to personalise all recommendations.`;
}

const INTRO_MESSAGE: AgentMessage = {
  role: 'agent',
  content: `👋 I'm your AI Marketing Agent for curex24 — powered by **ChatGPT (GPT-4o)**, **DALL-E 3**, **Midjourney**, **GitHub Copilot**, **Stable Diffusion**, and **Claude**.

Here's what I can do for you:

✍️ **Write** — ad copy, email sequences, social posts, Reels scripts, WhatsApp campaigns
📊 **Strategise** — budget allocation, channel prioritisation, retention analysis
🖼️ **Generate visuals** — actual AI-generated images for Instagram, LinkedIn, Facebook, infographics, banners — ready to download
📣 **Build campaigns** — Google, Meta, LinkedIn, YouTube — full creative packages

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
  const [messages, setMessages] = useState<AgentMessage[]>([INTRO_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  function send(text: string) {
    if (!text.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: AgentMessage = { role: 'user', content: text, timestamp: now };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setTimeout(() => {
      const content = getAgentResponse(text);
      const imagePrompt = getImagePromptForRequest(text.trim().toLowerCase());
      const agentMsg: AgentMessage = {
        role: 'agent',
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ...(imagePrompt ? { imagePrompt } : {}),
      };
      setMessages((prev) => [...prev, agentMsg]);
      setIsTyping(false);
    }, 1200);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto">
      {/* AI Skills Banner */}
      <div className="bg-gradient-to-r from-primary/10 to-purple-50 border border-primary/20 rounded-xl px-4 py-2.5 flex flex-wrap items-center gap-2 mb-3 shrink-0">
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">Powered by</span>
        {['ChatGPT (GPT-4o)', 'DALL-E 3', 'Midjourney', 'GitHub Copilot', 'Stable Diffusion', 'Claude'].map((tool) => (
          <span key={tool} className="text-xs px-2 py-0.5 bg-white border border-gray-200 rounded-full text-gray-700 font-medium">
            {tool}
          </span>
        ))}
        <Link href="/create" className="ml-auto text-xs px-3 py-1 bg-primary text-white rounded-full font-semibold hover:bg-primary-dark transition shrink-0">
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

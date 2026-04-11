'use client';

import { useState, useRef, useEffect } from 'react';
import { sampleConversation, type AgentMessage } from '@/lib/data';

const suggestedPrompts = [
  "What should I focus on this week?",
  "Write Google Search ad copy for home visits in Mumbai",
  "Draft a LinkedIn post to recruit providers",
  "What's my biggest retention risk right now?",
  "Write the Day 3 onboarding email",
  "Suggest 5 SEO article ideas for the health blog",
  "How should I allocate my ₹5L marketing budget?",
  "Create a campaign brief for Meta retargeting",
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
};

function getAgentResponse(userMessage: string): string {
  const match = Object.keys(agentResponses).find((k) =>
    userMessage.toLowerCase().includes(k.toLowerCase().slice(0, 20))
  );
  if (match) return agentResponses[match];

  if (userMessage.toLowerCase().includes('budget') || userMessage.toLowerCase().includes('allocat')) {
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

  if (userMessage.toLowerCase().includes('retention') || userMessage.toLowerCase().includes('churn')) {
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

  return `I'd be happy to help with that. Based on curex24's current marketing position:

**Key context:**
• You're in early growth stage (1→10)
• Primary bottleneck: provider supply + D30 patient retention
• Budget: ₹5L/mo, 60% Google Search, 25% Meta
• Top performing: referrals and direct search intent

To give you the most targeted recommendation on "${userMessage}", I'd need a bit more context:
- Is this for patient acquisition, provider recruitment, or retention?
- Which city/market is your priority right now?
- What's your timeline?

Alternatively, use the **Intake** section to complete your business questionnaire — it will personalise all my recommendations automatically.`;
}

function MessageBubble({ msg }: { msg: AgentMessage }) {
  const isAgent = msg.role === 'agent';
  return (
    <div className={`flex ${isAgent ? 'justify-start' : 'justify-end'} mb-4`}>
      {isAgent && (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0 mr-3 mt-1">
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
        <div className={`text-xs mt-1 ${isAgent ? 'text-gray-400' : 'text-primary-light'}`}>{msg.timestamp}</div>
      </div>
      {!isAgent && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold shrink-0 ml-3 mt-1">
          You
        </div>
      )}
    </div>
  );
}

export default function AgentPage() {
  const [messages, setMessages] = useState<AgentMessage[]>(sampleConversation);
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
      const response = getAgentResponse(text);
      const agentMsg: AgentMessage = { role: 'agent', content: response, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      setMessages((prev) => [...prev, agentMsg]);
      setIsTyping(false);
    }, 1200);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto">
      {/* Suggested prompts */}
      <div className="flex gap-2 flex-wrap mb-4 shrink-0">
        {suggestedPrompts.slice(0, 4).map((p) => (
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
      <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 overflow-y-auto p-4 mb-4">
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}
        {isTyping && (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">🤖</div>
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

      {/* More suggested prompts */}
      <div className="flex gap-2 flex-wrap mb-3 shrink-0">
        {suggestedPrompts.slice(4).map((p) => (
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

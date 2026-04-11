import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

const sections = [
  {
    id: 'brand',
    icon: '🏷️',
    title: 'Brand Strategy',
    subsections: [
      {
        heading: 'Positioning Statement',
        content: '"curex24 is the fastest, most trusted way to connect with verified healthcare providers — on your terms, at your time."',
        type: 'quote',
      },
      {
        heading: 'Brand Narrative Pillars',
        type: 'pillars',
        items: [
          { icon: '🔒', label: 'Trust', detail: 'Verified providers, transparent pricing, real reviews' },
          { icon: '⚡', label: 'Speed', detail: 'Book in minutes, get care today' },
          { icon: '🏠', label: 'Convenience', detail: 'Home visits, clinic visits, on-demand' },
          { icon: '💪', label: 'Empowerment', detail: 'Patients in control of their health' },
        ],
      },
      {
        heading: 'Tone of Voice',
        content: 'Warm, clear, confident, human. Not clinical. Not corporate. Speaks like a trusted friend who happens to know healthcare.',
        type: 'text',
      },
    ],
  },
  {
    id: 'audience',
    icon: '👥',
    title: 'Audience Segmentation',
    subsections: [
      {
        heading: 'Patient ICPs',
        type: 'table',
        headers: ['Persona', 'Description', 'Key Message'],
        rows: [
          ['Urban Busy Professional', '25–40, metro city, needs care without taking a day off', '"Book in 2 min, skip the waiting room"'],
          ['Parent / Caregiver', '30–50, managing family health, needs reliability', '"Trusted doctors, at home or clinic"'],
          ['Senior / Elderly Support', '55+, or adult children managing for them', '"Easy, safe, verified — no tech stress"'],
          ['Chronic Condition Manager', 'Frequent diagnostics/consultations, needs continuity', '"Your care team, always available"'],
        ],
      },
      {
        heading: 'Provider ICPs',
        type: 'table',
        headers: ['Persona', 'Description', 'Key Message'],
        rows: [
          ['Independent Doctor', 'Solo practice, wants more patients without marketing effort', '"Grow your practice. We bring patients to you."'],
          ['Clinic Owner', 'Has staff, wants to fill appointment slots', '"Fill your schedule. Zero upfront cost."'],
          ['Diagnostic Center', 'High-volume, needs steady patient flow', '"Expand reach. Grow bookings."'],
        ],
      },
    ],
  },
  {
    id: 'channels',
    icon: '📡',
    title: 'Channel Strategy',
    subsections: [
      {
        heading: 'Priority Channels by Stage',
        type: 'table',
        headers: ['Stage', 'Primary Channels', 'Secondary'],
        rows: [
          ['0→1 (pre-PMF)', 'Referrals, community, local partnerships, content SEO', 'LinkedIn, WhatsApp groups'],
          ['1→10 (early growth)', 'Google Performance Max, Meta retargeting, SEO, email', 'Influencers, PR'],
          ['10→100 (scale)', 'Paid search + social at scale, affiliate, PLG', 'OOH in target cities, partnerships'],
        ],
      },
      {
        heading: 'Budget Allocation (Starter)',
        type: 'bars',
        items: [
          { label: 'Google Search', pct: 60, color: 'bg-blue-500' },
          { label: 'Meta (awareness + remarketing)', pct: 25, color: 'bg-indigo-400' },
          { label: 'Experimental (YouTube, Reddit, hyperlocal)', pct: 15, color: 'bg-purple-400' },
        ],
      },
    ],
  },
  {
    id: 'gtm',
    icon: '🚀',
    title: 'GTM Strategy',
    subsections: [
      {
        heading: 'Launch Sequence',
        type: 'steps',
        items: [
          { step: '1', title: 'Seed Supply', detail: 'Onboard 50 verified providers in target city before demand launch' },
          { step: '2', title: 'Activate Demand', detail: 'Launch Google Search + referral in parallel — prioritise high-intent patients' },
          { step: '3', title: 'Collect Proof', detail: 'Drive first 100 completed bookings; collect reviews and testimonials' },
          { step: '4', title: 'Amplify', detail: 'Use social proof to scale paid ads and content — lower CAC through trust' },
          { step: '5', title: 'Expand', detail: 'Replicate city playbook in next market with learnings from city 1' },
        ],
      },
    ],
  },
  {
    id: 'growth',
    icon: '📈',
    title: 'Growth & Acquisition',
    subsections: [
      {
        heading: 'Referral Strategy',
        type: 'two-col',
        items: [
          { label: 'Patient Referral', detail: 'Reward: ₹100 booking credit (drives repeat use). Mechanic: unique link in post-booking screen + email. Goal: 15% of new acquisitions within 6 months.' },
          { label: 'Provider Referral', detail: 'Reward: reduced commission for 3 months per referred provider. Mechanic: dashboard link + WhatsApp sharing. Goal: 20% of new provider supply via referral.' },
        ],
      },
      {
        heading: 'Partnership Tiers',
        type: 'table',
        headers: ['Tier', 'Partner Type', 'Goal'],
        rows: [
          ['Tier 1', 'Corporate HR / employee wellness', 'Bulk patient acquisition, B2B revenue'],
          ['Tier 2', 'Insurance companies', 'Co-marketing, claims-linked bookings'],
          ['Tier 3', 'Pharmacies / medical supply', 'Cross-referral, bundle offers'],
          ['Tier 4', 'Health content creators / patient advocates', 'Awareness, trust'],
        ],
      },
    ],
  },
  {
    id: 'content',
    icon: '✍️',
    title: 'Content Strategy',
    subsections: [
      {
        heading: 'Content Pillars',
        type: 'pillars',
        items: [
          { icon: '📚', label: 'Patient Education', detail: 'Health tips, when to see a doctor, how diagnostics work' },
          { icon: '⭐', label: 'Provider Spotlights', detail: 'Build trust through featured provider stories' },
          { icon: '📱', label: 'Product Education', detail: 'How to use curex24 features (home visit, tracking, payments)' },
          { icon: '🏆', label: 'Social Proof', detail: 'Patient testimonials, booking milestones, provider reviews' },
          { icon: '🏙️', label: 'Local Health', detail: 'City-specific health events, disease awareness, local partnerships' },
        ],
      },
      {
        heading: 'Platform Strategy',
        type: 'table',
        headers: ['Platform', 'Content Type', 'Frequency'],
        rows: [
          ['Instagram', 'Visual storytelling, provider spotlights, patient journeys', '4x/week'],
          ['LinkedIn', 'B2B provider recruitment, company updates, thought leadership', '3x/week'],
          ['YouTube Shorts/Reels', '30–60 sec explainers and patient stories', '2x/week'],
          ['WhatsApp Broadcast', 'Retention, re-engagement, health reminders', '2x/week'],
          ['Blog/SEO', 'Long-form informational + transactional content', '2x/week'],
        ],
      },
    ],
  },
  {
    id: 'retention',
    icon: '🔄',
    title: 'Retention Strategy',
    subsections: [
      {
        heading: 'Retention Objectives by Cohort',
        type: 'table',
        headers: ['Cohort', 'Target', 'Primary Lever'],
        rows: [
          ['D7', '> 40%', 'Post-booking review request + follow-up care suggestion'],
          ['D30', '> 25%', 'Re-engagement email + personalised provider recommendation'],
          ['D90', '> 15%', 'Win-back campaign + loyalty credit'],
        ],
      },
      {
        heading: 'Key CRM Triggers',
        type: 'steps',
        items: [
          { step: '✅', title: 'Booking completed', detail: 'Review request 24h after booking completes' },
          { step: '❌', title: 'Booking cancelled', detail: 'Recovery flow — offer alternative provider or time slot' },
          { step: '⏰', title: 'Upcoming appointment', detail: 'Reminder 1 day + 1 hour before appointment' },
          { step: '📋', title: 'License renewal approaching', detail: 'Alert notification to provider 30 days before expiry' },
        ],
      },
    ],
  },
];

export default function StrategyPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <p className="text-sm text-purple-700">
          <strong>📌 Strategy Framework</strong> — This is your full marketing strategy, tailored to curex24&apos;s healthcare marketplace model. Use the intake questionnaire to refine these recommendations to your specific stage and budget.
        </p>
      </div>

      {sections.map((section) => (
        <Card key={section.id} title={`${section.icon} ${section.title}`}>
          <div className="space-y-6">
            {section.subsections.map((rawSub) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const sub = rawSub as any;
              return (
              <div key={sub.heading}>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">{sub.heading}</h4>

                {sub.type === 'quote' && (
                  <blockquote className="border-l-4 border-primary pl-4 italic text-gray-700 text-sm bg-primary/5 py-2 pr-4 rounded-r-lg">
                    {sub.content}
                  </blockquote>
                )}

                {sub.type === 'text' && (
                  <p className="text-sm text-gray-600">{sub.content}</p>
                )}

                {sub.type === 'pillars' && sub.items && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {sub.items.map((item: { icon: string; label: string; detail: string }) => (
                      <div key={item.label} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-center">
                        <div className="text-2xl mb-1">{item.icon}</div>
                        <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                        <p className="text-xs text-gray-500 mt-1">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                )}

                {sub.type === 'table' && sub.headers && sub.rows && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          {(sub.headers as string[]).map((h) => (
                            <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(sub.rows as string[][]).map((row, ri) => (
                          <tr key={ri} className="border-b border-gray-50 hover:bg-gray-50">
                            {row.map((cell, ci) => (
                              <td key={ci} className="py-2.5 px-3 text-gray-700">{ci === 0 ? <strong>{cell}</strong> : cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {sub.type === 'bars' && sub.items && (
                  <div className="space-y-3">
                    {(sub.items as { label: string; pct: number; color: string }[]).map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>{item.label}</span>
                          <span className="font-semibold">{item.pct}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3">
                          <div className={`${item.color} h-3 rounded-full`} style={{ width: `${item.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {sub.type === 'steps' && sub.items && (
                  <div className="space-y-3">
                    {(sub.items as { step: string; title: string; detail: string }[]).map((item) => (
                      <div key={item.title} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                          {item.step}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                          <p className="text-xs text-gray-500">{item.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {sub.type === 'two-col' && sub.items && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(sub.items as { label: string; detail: string }[]).map((item) => (
                      <div key={item.label} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-sm font-semibold text-gray-800 mb-1">
                          <Badge variant="purple">{item.label}</Badge>
                        </p>
                        <p className="text-sm text-gray-600 mt-2">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}

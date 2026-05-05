import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

type PillarItem = { icon: string; label: string; detail: string };
type BarItem = { label: string; pct: number; color: string };
type StepItem = { step: string; title: string; detail: string };
type TwoColItem = { label: string; detail: string };

type Subsection =
  | { heading: string; type: 'quote'; content: string }
  | { heading: string; type: 'text'; content: string }
  | { heading: string; type: 'pillars'; items: PillarItem[] }
  | { heading: string; type: 'table'; headers: string[]; rows: string[][] }
  | { heading: string; type: 'bars'; items: BarItem[] }
  | { heading: string; type: 'steps'; items: StepItem[] }
  | { heading: string; type: 'two-col'; items: TwoColItem[] };

const sections: Array<{ id: string; icon: string; title: string; subsections: Subsection[] }> = [
  {
    id: 'brand',
    icon: '🏷️',
    title: 'Brand Strategy',
    subsections: [
      {
        heading: 'Positioning Statement',
        content: '"Our brand is the fastest, most trusted way to get [your core outcome] — on your terms, at your time."',
        type: 'quote',
      },
      {
        heading: 'Brand Narrative Pillars',
        type: 'pillars',
        items: [
          { icon: '🔒', label: 'Trust', detail: 'Verified partners, transparent pricing, real reviews' },
          { icon: '⚡', label: 'Speed', detail: 'Get started in minutes — value delivered today' },
          { icon: '🏠', label: 'Convenience', detail: 'Available where and when our customers need us' },
          { icon: '💪', label: 'Empowerment', detail: 'Customers in control of their own decisions' },
        ],
      },
      {
        heading: 'Tone of Voice',
        content: 'Warm, clear, confident, human. Not corporate. Speaks like a trusted friend who knows the category.',
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
        heading: 'Customer ICPs',
        type: 'table',
        headers: ['Persona', 'Description', 'Key Message'],
        rows: [
          ['Urban Busy Professional', '25–40, metro city, needs the outcome without taking a day off', '"Get started in 2 min, skip the friction"'],
          ['Household Decision-Maker', '30–50, manages the family or team, needs reliability', '"Trusted partners, anywhere you need us"'],
          ['Senior / Assisted User', '55+, or adult children managing on their behalf', '"Easy, safe, verified — no tech stress"'],
          ['Power User', 'Frequent / repeat usage, needs continuity and depth', '"Your workspace, always available"'],
        ],
      },
      {
        heading: 'Partner ICPs',
        type: 'table',
        headers: ['Persona', 'Description', 'Key Message'],
        rows: [
          ['Independent Operator', 'Solo professional, wants more customers without marketing effort', '"Grow your practice. We bring customers to you."'],
          ['Established Business', 'Has staff, wants to fill capacity', '"Fill your schedule. Zero upfront cost."'],
          ['High-Volume Supplier', 'High throughput, needs steady demand flow', '"Expand reach. Grow transactions."'],
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
          { step: '1', title: 'Seed Supply', detail: 'Onboard 50 verified partners in target market before launching demand' },
          { step: '2', title: 'Activate Demand', detail: 'Launch Google Search + referral in parallel — prioritise high-intent customers' },
          { step: '3', title: 'Collect Proof', detail: 'Drive first 100 completed transactions; collect reviews and testimonials' },
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
          { label: 'Customer Referral', detail: 'Reward: a credit toward the next purchase (drives repeat use). Mechanic: unique link in post-purchase screen + email. Goal: 15% of new acquisitions within 6 months.' },
          { label: 'Partner Referral', detail: 'Reward: reduced commission for 3 months per referred partner. Mechanic: dashboard link + WhatsApp/email sharing. Goal: 20% of new partner supply via referral.' },
        ],
      },
      {
        heading: 'Partnership Tiers',
        type: 'table',
        headers: ['Tier', 'Partner Type', 'Goal'],
        rows: [
          ['Tier 1', 'Corporate / employee-perk programs', 'Bulk customer acquisition, B2B revenue'],
          ['Tier 2', 'Adjacent platforms (insurance, fintech, etc.)', 'Co-marketing, embedded distribution'],
          ['Tier 3', 'Complementary product / service vendors', 'Cross-referral, bundle offers'],
          ['Tier 4', 'Content creators / category advocates', 'Awareness, trust'],
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
          { icon: '📚', label: 'Audience Education', detail: 'Useful tips, when and why to use the category, how the process works' },
          { icon: '⭐', label: 'Partner Spotlights', detail: 'Build trust through featured partner stories' },
          { icon: '📱', label: 'Product Education', detail: 'How to use core features (signup, tracking, payments, etc.)' },
          { icon: '🏆', label: 'Social Proof', detail: 'Customer testimonials, milestones, partner reviews' },
          { icon: '🏙️', label: 'Local & Community', detail: 'City-specific events, awareness moments, local partnerships' },
        ],
      },
      {
        heading: 'Platform Strategy',
        type: 'table',
        headers: ['Platform', 'Content Type', 'Frequency'],
        rows: [
          ['Instagram', 'Visual storytelling, partner spotlights, customer journeys', '4x/week'],
          ['LinkedIn', 'B2B partner recruitment, company updates, thought leadership', '3x/week'],
          ['YouTube Shorts/Reels', '30–60 sec explainers and customer stories', '2x/week'],
          ['WhatsApp Broadcast', 'Retention, re-engagement, timely reminders', '2x/week'],
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
          ['D7', '> 40%', 'Post-purchase review request + follow-up suggestion'],
          ['D30', '> 25%', 'Re-engagement email + personalised partner / product recommendation'],
          ['D90', '> 15%', 'Win-back campaign + loyalty credit'],
        ],
      },
      {
        heading: 'Key CRM Triggers',
        type: 'steps',
        items: [
          { step: '✅', title: 'Transaction completed', detail: 'Review request 24h after the transaction completes' },
          { step: '❌', title: 'Transaction cancelled', detail: 'Recovery flow — offer alternative partner or time slot' },
          { step: '⏰', title: 'Upcoming appointment / delivery', detail: 'Reminder 1 day + 1 hour before the scheduled time' },
          { step: '📋', title: 'Partner credential renewal', detail: 'Alert notification to partner 30 days before expiry' },
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
          <strong>📌 Strategy Framework</strong> — This is a full marketing strategy you can adapt to your brand. Use the intake questionnaire to refine these recommendations to your specific stage and budget.
        </p>
      </div>

      {sections.map((section) => (
        <Card key={section.id} title={`${section.icon} ${section.title}`}>
          <div className="space-y-6">
            {section.subsections.map((sub) => (
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

                {sub.type === 'pillars' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {sub.items.map((item) => (
                      <div key={item.label} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-center">
                        <div className="text-2xl mb-1">{item.icon}</div>
                        <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                        <p className="text-xs text-gray-500 mt-1">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                )}

                {sub.type === 'table' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          {sub.headers.map((h) => (
                            <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sub.rows.map((row, ri) => (
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

                {sub.type === 'bars' && (
                  <div className="space-y-3">
                    {sub.items.map((item) => (
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

                {sub.type === 'steps' && (
                  <div className="space-y-3">
                    {sub.items.map((item) => (
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

                {sub.type === 'two-col' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sub.items.map((item) => (
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
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

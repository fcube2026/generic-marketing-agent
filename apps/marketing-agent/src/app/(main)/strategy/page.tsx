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
        content: '"your brand is the simplest, most trusted way to budget, save and invest as a household — on your terms, in your language."',
        type: 'quote',
      },
      {
        heading: 'Brand Narrative Pillars',
        type: 'pillars',
        items: [
          { icon: '🔒', label: 'Trust', detail: 'Bank-grade security, transparent pricing, real members' },
          { icon: '⚡', label: 'Simplicity', detail: 'Set up in minutes, jargon-free explanations' },
          { icon: '👨\u200d👩\u200d👧', label: 'Family-first', detail: 'Shared budgets, goals and circles for the whole household' },
          { icon: '💪', label: 'Empowerment', detail: 'Members in control of their money, every month' },
        ],
      },
      {
        heading: 'Tone of Voice',
        content: 'Warm, clear, confident, human. Not jargon-heavy. Not corporate. Speaks like a trusted friend who happens to know personal finance.',
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
        heading: 'Member ICPs',
        type: 'table',
        headers: ['Persona', 'Description', 'Key Message'],
        rows: [
          ['Urban Salaried Professional', '25–40, metro city, salaried, first-time investor', '"Start your SIP in 2 minutes — track every rupee"'],
          ['Household CFO', '30–50, runs the family budget, juggles EMIs and goals', '"One app for the whole family\u2019s money"'],
          ['Senior / Retiree Support', '55+, or adult children managing for them', '"Simple, safe, transparent — no jargon"'],
          ['Goal-oriented Saver', 'Saving for a specific goal — house, education, retirement', '"Your goal, on autopilot"'],
        ],
      },
      {
        heading: 'Subscriber ICPs',
        type: 'table',
        headers: ['Persona', 'Description', 'Key Message'],
        rows: [
          ['Premium Family', 'Couple/family wanting shared dashboards and goal-based investing', '"One plan for the whole household"'],
          ['Tax & Wealth Planner', 'High-income earner needing tax + portfolio tools', '"Premium tools to keep more of what you earn"'],
          ['Annual-plan Loyalist', 'Active free user, ready to commit to a yearly plan for savings', '"Save 20% — switch to annual"'],
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
          ['0→1 (pre-PMF)', 'Referrals, community, creator partnerships, content SEO', 'LinkedIn, WhatsApp groups'],
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
          { step: '1', title: 'Seed Members', detail: 'Onboard 500 active members in target city before paid launch' },
          { step: '2', title: 'Activate Demand', detail: 'Launch Google Search + referral in parallel — prioritise high-intent budget/SIP keywords' },
          { step: '3', title: 'Collect Proof', detail: 'Drive first 100 paid subscriptions; collect reviews and member testimonials' },
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
          { label: 'Member Referral', detail: 'Reward: ₹100 subscription credit (drives upgrade). Mechanic: unique link in post-budget-setup screen + email. Goal: 15% of new acquisitions within 6 months.' },
          { label: 'Family-Circle Referral', detail: 'Reward: 1 free month of premium per joined family member. Mechanic: in-app share + WhatsApp. Goal: 30% of subscribers add at least one family member within 90 days.' },
        ],
      },
      {
        heading: 'Partnership Tiers',
        type: 'table',
        headers: ['Tier', 'Partner Type', 'Goal'],
        rows: [
          ['Tier 1', 'Corporate HR / employee financial-wellness', 'Bulk member acquisition, B2B revenue'],
          ['Tier 2', 'Banks / NBFCs / mutual fund houses', 'Co-marketing, embedded subscriptions'],
          ['Tier 3', 'Tax filing / accounting platforms', 'Cross-referral, bundled offers'],
          ['Tier 4', 'Personal-finance creators / educators', 'Awareness, trust'],
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
          { icon: '💸', label: 'Budgeting & Money Habits', detail: 'How to budget, save, and avoid common money mistakes' },
          { icon: '📈', label: 'Saving & Investing', detail: 'SIP, mutual funds, FDs, tax-saving — explained simply' },
          { icon: '📱', label: 'Product Education', detail: 'How to use your brand features (budgets, goals, family circles)' },
          { icon: '🏆', label: 'Social Proof', detail: 'Member testimonials, savings milestones, goal achievements' },
          { icon: '👨\u200d👩\u200d👧', label: 'Family Finance', detail: 'Household budgeting, kids\u2019 money habits, joint goals' },
        ],
      },
      {
        heading: 'Platform Strategy',
        type: 'table',
        headers: ['Platform', 'Content Type', 'Frequency'],
        rows: [
          ['Instagram', 'Visual storytelling, member spotlights, money journeys', '4x/week'],
          ['LinkedIn', 'B2B financial-wellness, company updates, thought leadership', '3x/week'],
          ['YouTube Shorts/Reels', '30–60 sec explainers and member stories', '2x/week'],
          ['WhatsApp Broadcast', 'Retention, re-engagement, money tips', '2x/week'],
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
          ['D7', '> 40%', 'Post-first-budget nudge + first savings-goal suggestion'],
          ['D30', '> 25%', 'Re-engagement email + personalised savings insight'],
          ['D90', '> 15%', 'Win-back campaign + loyalty credit'],
        ],
      },
      {
        heading: 'Key CRM Triggers',
        type: 'steps',
        items: [
          { step: '✅', title: 'First budget set up', detail: 'Celebration email 24h after, with savings-goal CTA' },
          { step: '❌', title: 'Subscription cancelled', detail: 'Recovery flow — offer pause / downgrade / annual switch' },
          { step: '⏰', title: 'Renewal upcoming', detail: 'Reminder 7 days + 1 day before renewal' },
          { step: '📋', title: 'Failed payment', detail: 'Dunning sequence: retry, alternative method, save offer' },
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
          <strong>📌 Strategy Framework</strong> — This is your full marketing strategy, tailored to a personal-finance subscription business. Use the intake questionnaire to refine these recommendations to your specific stage and budget.
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

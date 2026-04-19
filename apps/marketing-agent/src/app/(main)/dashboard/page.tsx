import Link from 'next/link';
import { StatCard } from '@/components/ui/Card';
import Card from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import {
  northStarKpis,
  acquisitionKpis,
  ninetyDayPlan,
  experiments,
} from '@/lib/data';

const quickActions = [
  { href: '/intake', label: 'Complete Intake', icon: '📝', desc: 'Answer business questions to personalise strategy' },
  { href: '/campaigns', label: 'View Campaigns', icon: '📣', desc: 'See active campaigns and generate new briefs' },
  { href: '/content-calendar', label: 'Content Calendar', icon: '📅', desc: 'Plan this week\'s content across platforms' },
  { href: '/create', label: 'Create Content', icon: '✨', desc: 'Generate posts, visuals, and ad creatives with AI' },
  { href: '/agent', label: 'Ask Marketing Agent', icon: '🤖', desc: 'Get instant strategic or copy recommendations' },
];

const phaseColors: Record<string, string> = {
  '1-30': 'bg-green-50 border-green-200',
  '31-60': 'bg-blue-50 border-blue-200',
  '61-90': 'bg-purple-50 border-purple-200',
};

const phaseLabels: Record<string, string> = {
  '1-30': 'Days 1-30',
  '31-60': 'Days 31-60',
  '61-90': 'Days 61-90',
};

export default function DashboardPage() {
  const runningExperiments = experiments.filter((e) => e.status === 'running');
  const completedTasks = ninetyDayPlan.filter((t) => t.done).length;
  const totalTasks = ninetyDayPlan.length;

  const phaseProgress: Record<string, { done: number; total: number }> = {
    '1-30': { done: 0, total: 0 },
    '31-60': { done: 0, total: 0 },
    '61-90': { done: 0, total: 0 },
  };
  for (const item of ninetyDayPlan) {
    phaseProgress[item.phase].total++;
    if (item.done) phaseProgress[item.phase].done++;
  }

  return (
    <div className="space-y-8">
      {/* North Star */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">North Star Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {northStarKpis.map((kpi) => (
            <StatCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              icon={kpi.icon}
              trend={kpi.trend}
              target={kpi.target}
              status={kpi.status}
            />
          ))}
        </div>
      </section>

      {/* Acquisition KPIs */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Acquisition KPIs</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {acquisitionKpis.map((kpi) => (
            <StatCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              icon={kpi.icon}
              trend={kpi.trend}
              target={kpi.target}
              status={kpi.status}
            />
          ))}
        </div>
      </section>

      {/* Quick Actions + Running Experiments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Quick Actions" subtitle="Jump to the most important tasks">
          <div className="space-y-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition group"
              >
                <span className="text-2xl mt-0.5">{action.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-primary">{action.label}</p>
                  <p className="text-xs text-gray-500">{action.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card title="Running Experiments" subtitle={`${runningExperiments.length} active tests`}>
          <div className="space-y-3">
            {runningExperiments.map((exp) => (
              <div key={exp.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-800">{exp.name}</p>
                  <StatusBadge status={exp.status} />
                </div>
                <p className="text-xs text-gray-500">{exp.channel} · {exp.metric}</p>
                <p className="text-xs text-gray-400 mt-1">Started {exp.startDate} · Ends {exp.endDate}</p>
              </div>
            ))}
            {runningExperiments.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No experiments running. <Link href="/experiments" className="text-primary underline">Start one →</Link></p>
            )}
          </div>
        </Card>
      </div>

      {/* 90-Day Plan Progress */}
      <Card title="90-Day Plan Progress" subtitle={`${completedTasks} of ${totalTasks} tasks completed`}>
        <div className="space-y-4">
          <ProgressBar value={completedTasks} max={totalTasks} label="Overall progress" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {(Object.keys(phaseProgress) as Array<keyof typeof phaseProgress>).map((phase) => {
              const { done, total } = phaseProgress[phase];
              return (
                <div key={phase} className={`rounded-lg border p-4 ${phaseColors[phase]}`}>
                  <p className="text-sm font-semibold text-gray-700 mb-2">{phaseLabels[phase]}</p>
                  <ProgressBar value={done} max={total} showPercent />
                  <p className="text-xs text-gray-500 mt-1">{done} / {total} tasks done</p>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* This Week's Priorities */}
      <Card title="This Week's Priorities" subtitle="Recommended by your Marketing Agent">
        <div className="space-y-3">
          {[
            { priority: '🔴 Critical', title: 'Launch LinkedIn provider recruitment campaign', detail: 'Active provider count at 148 vs target 200 — supply is the #1 growth constraint.' },
            { priority: '🟡 At Risk', title: 'Activate Day 3 onboarding incentive email A/B test', detail: 'Signup → first booking rate is 28% vs 35% target. Day 3 email has the highest leverage.' },
            { priority: '🟢 Quick Win', title: 'Add referral CTA to post-booking confirmation screen', detail: 'Referrals at 9% vs 15% target. 1-day engineering task, high long-term ROI.' },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-sm mt-0.5 shrink-0">{item.priority}</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

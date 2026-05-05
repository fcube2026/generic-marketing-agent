'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import Badge from '@/components/ui/Badge';
import { listLifecycleFlows } from '@/lib/services/marketingService';
import type { LifecycleFlow } from '@/lib/types';

function FlowCard({ flow }: { flow: LifecycleFlow }) {
  const [expanded, setExpanded] = useState(false);
  const channelIcons: Record<string, string> = {
    Email: '📧',
    Push: '📱',
    SMS: '💬',
    'Push + SMS': '📱',
    'Email + Push': '📧',
    'Email + SMS': '📧',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-gray-800">{flow.name}</h3>
            <Badge variant={flow.segment === 'customer' ? 'info' : 'purple'}>
              {flow.segment === 'customer' ? '🧑 Customer' : '🤝 Partner'}
            </Badge>
            <StatusBadge status={flow.status} />
          </div>
          <p className="text-xs text-gray-500">Trigger: {flow.trigger} · {flow.steps.length} steps</p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-primary font-medium hover:underline"
        >
          {expanded ? 'Hide Steps ↑' : 'View Steps ↓'}
        </button>
      </div>

      {expanded && (
        <div className="px-6 pb-6 border-t border-gray-100 pt-4 bg-gray-50">
          <div className="relative">
            {flow.steps.map((step, idx) => (
              <div key={idx} className="flex gap-4 mb-4 last:mb-0">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
                    D{step.day}
                  </div>
                  {idx < flow.steps.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                </div>
                <div className="pb-4 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{channelIcons[step.channel] ?? '📣'}</span>
                    <span className="text-xs font-semibold text-gray-500">{step.channel}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">&ldquo;{step.message}&rdquo;</p>
                  <p className="text-xs text-gray-500 mt-0.5">Goal: {step.goal}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LifecyclePage() {
  const [segment, setSegment] = useState<'all' | 'customer' | 'partner'>('all');
  const [lifecycleFlows, setLifecycleFlows] = useState<LifecycleFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listLifecycleFlows()
      .then((flows) => {
        if (!cancelled) setLifecycleFlows(flows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load lifecycle flows');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />;
  if (error)
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
        ⚠️ {error}
      </div>
    );

  const filtered = lifecycleFlows.filter((f) => segment === 'all' || f.segment === segment);
  const activeFlows = lifecycleFlows.filter((f) => f.status === 'active').length;
  const totalSteps = lifecycleFlows.reduce((sum, f) => sum + f.steps.length, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Flows', value: lifecycleFlows.length, icon: '🔄' },
          { label: 'Active Flows', value: activeFlows, icon: '✅' },
          { label: 'Total Steps', value: totalSteps, icon: '📬' },
          { label: 'Channels Used', value: 3, icon: '📡' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <span className="text-2xl">{s.icon}</span>
            <p className="text-2xl font-bold text-gray-900 mt-2">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Segment filter */}
      <div className="flex gap-2">
        {(['all', 'customer', 'partner'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSegment(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition capitalize ${
              segment === s ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
            }`}
          >
            {s === 'all' ? 'All Flows' : s === 'customer' ? '🧑 Customer' : '🤝 Partner'}
          </button>
        ))}
      </div>

      {/* Flows */}
      <div className="space-y-4">
        {filtered.map((flow) => (
          <FlowCard key={flow.id} flow={flow} />
        ))}
      </div>

      {/* CRM Triggers */}
      <Card title="Key CRM Automation Triggers" subtitle="Auto-triggered based on platform events">
        <div className="space-y-3">
          {[
            { trigger: 'Transaction completed', action: 'Review request email + push 24h after', priority: 'high' },
            { trigger: 'Transaction cancelled', action: 'Recovery flow — alternative partner/slot suggestions', priority: 'high' },
            { trigger: 'Upcoming appointment / delivery (1 day)', action: 'Reminder email + push notification', priority: 'high' },
            { trigger: 'Upcoming appointment / delivery (1 hour)', action: 'Final reminder push + SMS', priority: 'medium' },
            { trigger: '7 days since signup, no transaction', action: 'Nudge email with a first-purchase incentive', priority: 'high' },
            { trigger: '30 days inactive (customer)', action: 'Re-engagement email with personalised recommendation', priority: 'high' },
            { trigger: '60 days inactive (customer)', action: 'Win-back email with credit offer', priority: 'medium' },
            { trigger: 'Partner credential / listing expiry in 30 days', action: 'Alert notification to partner dashboard + email', priority: 'high' },
            { trigger: 'Partner receives 5-star review', action: 'Congratulations email + referral program CTA', priority: 'low' },
          ].map((row) => (
            <div key={row.trigger} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold mt-0.5 ${
                row.priority === 'high' ? 'bg-red-100 text-red-700' :
                row.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
              }`}>{row.priority}</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">{row.trigger}</p>
                <p className="text-xs text-gray-500 mt-0.5">{row.action}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Best practices */}
      <Card title="📌 Lifecycle Agent Guidance">
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• <strong>Day 3 email is the highest-leverage onboarding step</strong> — this is when intent is highest and the incentive has most impact.</li>
          <li>• <strong>Always personalise</strong> with first name, city, and the most relevant offering (e.g., &ldquo;Top partners near you in Mumbai&rdquo;).</li>
          <li>• <strong>Review requests within 24h</strong> of a transaction completing drive 3x higher review rate than requests sent later.</li>
          <li>• <strong>Win-back campaigns</strong> should include a tangible incentive — credits outperform discounts for driving repeat purchases.</li>
          <li>• <strong>Partner flows</strong> should lead with performance data — show them what they earned and what customers said, not just platform instructions.</li>
        </ul>
      </Card>
    </div>
  );
}

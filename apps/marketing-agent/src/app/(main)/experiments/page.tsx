'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { listExperiments } from '@/lib/services/marketingService';
import type { Experiment, ExperimentStatus } from '@/lib/types';

function ExperimentRow({ exp }: { exp: Experiment }) {
  const [expanded, setExpanded] = useState(false);
  const winnerColors: Record<string, string> = {
    control: 'text-blue-600 bg-blue-50 border-blue-200',
    variant: 'text-green-600 bg-green-50 border-green-200',
    'no-difference': 'text-gray-600 bg-gray-50 border-gray-200',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-gray-800">{exp.name}</h3>
            <StatusBadge status={exp.status} />
            {exp.winner && (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${winnerColors[exp.winner]}`}>
                {exp.winner === 'control' ? '✓ Control wins' : exp.winner === 'variant' ? '✓ Variant wins' : '= No difference'}
              </span>
            )}
            {exp.lift && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{exp.lift} lift</span>}
          </div>
          <p className="text-xs text-gray-500">{exp.channel} · {exp.metric}</p>
          <p className="text-xs text-gray-400 mt-0.5">{exp.startDate} → {exp.endDate}</p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-primary font-medium hover:underline shrink-0"
        >
          {expanded ? 'Hide ↑' : 'Details ↓'}
        </button>
      </div>

      {expanded && (
        <div className="px-6 pb-5 border-t border-gray-100 pt-4 bg-gray-50 space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Hypothesis</p>
            <p className="text-sm text-gray-700">{exp.hypothesis}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-3 rounded-lg border border-blue-200">
              <p className="text-xs font-semibold text-blue-600 mb-1">Control (A)</p>
              <p className="text-sm text-gray-800">{exp.control}</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-green-200">
              <p className="text-xs font-semibold text-green-600 mb-1">Variant (B)</p>
              <p className="text-sm text-gray-800">{exp.variant}</p>
            </div>
          </div>
          {exp.result && (
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Result</p>
              <p className="text-sm text-gray-800">{exp.result}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExperimentsPage() {
  const [filter, setFilter] = useState<ExperimentStatus | 'all'>('all');
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listExperiments()
      .then((items) => {
        if (!cancelled) setExperiments(items);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load experiments');
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

  const filtered = experiments.filter((e) => filter === 'all' || e.status === filter);
  const counts = {
    running: experiments.filter((e) => e.status === 'running').length,
    completed: experiments.filter((e) => e.status === 'completed').length,
    planned: experiments.filter((e) => e.status === 'planned').length,
  };
  const winnerVariant = experiments.filter((e) => e.winner === 'variant').length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Running', value: counts.running, icon: '🔬' },
          { label: 'Completed', value: counts.completed, icon: '✅' },
          { label: 'Planned', value: counts.planned, icon: '📋' },
          { label: 'Variant Wins', value: winnerVariant, icon: '🏆' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <span className="text-2xl">{s.icon}</span>
            <p className="text-2xl font-bold text-gray-900 mt-2">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Learnings summary */}
      {counts.completed > 0 && (
        <Card title="Key Learnings" subtitle="Decisions made from completed experiments">
          <div className="space-y-2">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              <strong>Landing page hero:</strong> Benefit-led copy (&ldquo;Get care in 30 minutes&rdquo;) outperforms feature-led copy (+14% booking start rate). <strong>Apply to all landing pages.</strong>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              <strong>Email subject line:</strong> Discount-led subject (&ldquo;Your ₹100 credit is waiting&rdquo;) outperforms FOMO subject (+4pp open rate). <strong>Use discount framing for onboarding emails.</strong>
            </div>
          </div>
        </Card>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'running', 'completed', 'planned', 'paused'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition capitalize ${
              filter === s ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
            }`}
          >
            {s === 'all' ? 'All Experiments' : s}
          </button>
        ))}
      </div>

      {/* Experiments */}
      <div className="space-y-4">
        {filtered.map((exp) => (
          <ExperimentRow key={exp.id} exp={exp} />
        ))}
      </div>

      {/* Experiment design template */}
      <Card title="📋 Experiment Design Template" subtitle="Use this structure when designing a new A/B test">
        <div className="space-y-2 text-sm text-gray-700">
          {[
            { field: 'Experiment Name', example: 'e.g. Meta Creative — Doctor Photo vs Patient Story' },
            { field: 'Hypothesis', example: 'e.g. Patient story video will drive higher CTR than doctor photo static ad' },
            { field: 'Channel', example: 'e.g. Meta Ads' },
            { field: 'Control (A)', example: 'e.g. Static image: doctor with rating overlay' },
            { field: 'Variant (B)', example: 'e.g. 20-second patient testimonial video' },
            { field: 'Primary Metric', example: 'e.g. CTR, Cost per booking start' },
            { field: 'Sample Size / Duration', example: 'e.g. Minimum 500 clicks per variant, 14 days' },
            { field: 'Decision Rule', example: 'e.g. Launch winner if >10% relative lift with statistical significance at 95%' },
          ].map((row) => (
            <div key={row.field} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="font-semibold text-gray-800 w-44 shrink-0">{row.field}</span>
              <span className="text-gray-500">{row.example}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

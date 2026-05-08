'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import {
  getNorthStarKpis,
  getAcquisitionKpis,
  getActivationKpis,
  getRetentionKpis,
} from '@/lib/services/marketingService';
import type { KpiMetric } from '@/lib/types';

const statusColorMap: Record<string, string> = {
  'on-track': 'bg-green-100 text-green-700',
  'at-risk': 'bg-yellow-100 text-yellow-700',
  behind: 'bg-red-100 text-red-700',
};

export default function ReportsPage() {
  const [northStar, setNorthStar] = useState<KpiMetric[]>([]);
  const [acquisition, setAcquisition] = useState<KpiMetric[]>([]);
  const [activation, setActivation] = useState<KpiMetric[]>([]);
  const [retention, setRetention] = useState<KpiMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getNorthStarKpis(),
      getAcquisitionKpis(),
      getActivationKpis(),
      getRetentionKpis(),
    ])
      .then(([ns, acq, act, ret]) => {
        if (cancelled) return;
        setNorthStar(ns);
        setAcquisition(acq);
        setActivation(act);
        setRetention(ret);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Failed to load reports';
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
        ⚠️ {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly digest */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-green-800 mb-1">📊 Weekly Marketing Digest</p>
        <p className="text-sm text-green-700">
          Live KPIs computed from subscription, payment, and signup data.
        </p>
      </div>

      <Card title="North Star Metrics">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {northStar.map((kpi) => (
            <div
              key={kpi.label}
              className={`p-4 rounded-lg border ${kpi.status === 'on-track' ? 'border-green-200 bg-green-50' : kpi.status === 'at-risk' ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{kpi.icon}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColorMap[kpi.status]}`}>{kpi.status}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              <p className="text-xs text-gray-600 mt-1">{kpi.label}</p>
              <p className="text-xs text-gray-400 mt-2">Target: {kpi.target}</p>
            </div>
          ))}
        </div>
      </Card>

      {[
        { title: 'Acquisition KPIs', items: acquisition },
        { title: 'Activation KPIs', items: activation },
        { title: 'Retention KPIs', items: retention },
      ].map((section) => (
        <Card key={section.title} title={section.title}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {section.items.map((kpi) => (
              <div key={kpi.label} className="p-4 rounded-lg border border-gray-200 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{kpi.icon}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColorMap[kpi.status]}`}>{kpi.status}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                <p className="text-xs text-gray-600 mt-1">{kpi.label}</p>
                <p className="text-xs text-gray-400 mt-2">Target: {kpi.target}</p>
              </div>
            ))}
            {section.items.length === 0 && (
              <p className="text-sm text-gray-500 col-span-full">No data yet.</p>
            )}
          </div>
        </Card>
      ))}

      {/* Done */}
    </div>
  );
}

'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { campaigns, type Campaign } from '@/lib/data';

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-800">{campaign.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{campaign.channel} · {campaign.budget} · {campaign.duration}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={campaign.status} />
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-primary font-medium hover:underline"
          >
            {expanded ? 'Hide Brief ↑' : 'View Brief ↓'}
          </button>
        </div>
      </div>

      <div className="px-6 py-4 space-y-3">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Objective</p>
          <p className="text-sm text-gray-700">{campaign.objective}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Target Audience</p>
          <p className="text-sm text-gray-700">{campaign.audience}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Primary KPI</p>
          <p className="text-sm text-gray-700">{campaign.kpi}</p>
        </div>
      </div>

      {expanded && (
        <div className="px-6 pb-6 border-t border-gray-100 pt-4 space-y-4 bg-gray-50">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Ad Headlines (3 Variations)</p>
            <div className="space-y-2">
              {campaign.headline.map((h, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs font-bold text-gray-400 mt-0.5">H{i + 1}</span>
                  <p className="text-sm font-semibold text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2 flex-1">{h}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Ad Descriptions (3 Variations)</p>
            <div className="space-y-2">
              {campaign.description.map((d, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs font-bold text-gray-400 mt-0.5">D{i + 1}</span>
                  <p className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 flex-1">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CampaignsPage() {
  const [filter, setFilter] = useState<Campaign['status'] | 'all'>('all');

  const filtered = campaigns.filter((c) => filter === 'all' || c.status === filter);
  const counts = {
    active: campaigns.filter((c) => c.status === 'active').length,
    planned: campaigns.filter((c) => c.status === 'planned').length,
    completed: campaigns.filter((c) => c.status === 'completed').length,
    paused: campaigns.filter((c) => c.status === 'paused').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Campaigns', value: counts.active, icon: '🟢' },
          { label: 'Planned', value: counts.planned, icon: '📋' },
          { label: 'Completed', value: counts.completed, icon: '✅' },
          { label: 'Paused', value: counts.paused, icon: '⏸️' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <span className="text-2xl">{s.icon}</span>
            <p className="text-2xl font-bold text-gray-900 mt-2">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'active', 'planned', 'completed', 'paused'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition capitalize ${
              filter === s ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
            }`}
          >
            {s === 'all' ? 'All Campaigns' : s}
          </button>
        ))}
      </div>

      {/* Campaign list */}
      <div className="space-y-4">
        {filtered.map((c) => (
          <CampaignCard key={c.id} campaign={c} />
        ))}
      </div>

      {/* Campaign brief template */}
      <Card title="📋 Campaign Brief Template" subtitle="Use this structure when requesting a new campaign brief from your team or AI agent">
        <div className="space-y-3 text-sm text-gray-700">
          {[
            { field: 'Campaign Name', example: 'e.g. Google Search — Diagnostics Delhi Q2' },
            { field: 'Objective', example: 'e.g. Acquire patients searching for home diagnostic tests in Delhi' },
            { field: 'Target Audience', example: 'e.g. Users searching "blood test at home delhi", "lab collection home"' },
            { field: 'Channel', example: 'e.g. Google Search Ads' },
            { field: 'Budget', example: 'e.g. ₹60,000/month' },
            { field: 'Duration', example: 'e.g. 8 weeks (Q2 2026)' },
            { field: 'Primary KPI', example: 'e.g. Booking completions, CAC < ₹280' },
            { field: 'Key Message', example: 'e.g. "Get a lab test at home — results in 24 hours"' },
            { field: 'Creative Assets Needed', example: 'e.g. 3 headlines, 3 descriptions, 1 landing page' },
          ].map((row) => (
            <div key={row.field} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="font-semibold text-gray-800 w-40 shrink-0">{row.field}</span>
              <span className="text-gray-500">{row.example}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { contentPillarMeta } from '@/lib/data';
import type { ContentItem, ContentPillar } from '@/lib/types';
import { listContentItems } from '@/lib/services/marketingService';

const platforms = ['All', 'Instagram', 'LinkedIn', 'Blog', 'YouTube', 'WhatsApp'];
const weeks = [1, 2, 3, 4];

export default function ContentCalendarPage() {
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>('all');
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [contentCalendar, setContentCalendar] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listContentItems()
      .then((items) => {
        if (!cancelled) setContentCalendar(items);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load content calendar');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />;
  }
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
        ⚠️ {error}
      </div>
    );
  }

  const filtered = contentCalendar.filter((item) => {
    const weekMatch = selectedWeek === 'all' || item.week === selectedWeek;
    const platformMatch = selectedPlatform === 'All' || item.platform === selectedPlatform;
    return weekMatch && platformMatch;
  });

  const publishedCount = contentCalendar.filter((i) => i.status === 'published').length;
  const plannedCount = contentCalendar.filter((i) => i.status === 'planned').length;

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Posts', value: contentCalendar.length, icon: '📄' },
          { label: 'Published', value: publishedCount, icon: '✅' },
          { label: 'Ready', value: contentCalendar.filter((i) => i.status === 'ready').length, icon: '🟢' },
          { label: 'In Progress', value: contentCalendar.filter((i) => i.status === 'in-progress').length, icon: '🟡' },
          { label: 'Planned', value: plannedCount, icon: '📋' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <span className="text-2xl">{s.icon}</span>
            <p className="text-2xl font-bold text-gray-900 mt-2">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pillar legend */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(contentPillarMeta) as [ContentPillar, typeof contentPillarMeta[ContentPillar]][]).map(([key, meta]) => (
          <span key={key} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${meta.color}`}>
            {meta.icon} {meta.label}
          </span>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-sm text-gray-500 font-medium">Week:</span>
        <button
          onClick={() => setSelectedWeek('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition ${selectedWeek === 'all' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary'}`}
        >
          All Weeks
        </button>
        {weeks.map((w) => (
          <button
            key={w}
            onClick={() => setSelectedWeek(w)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition ${selectedWeek === w ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary'}`}
          >
            Week {w}
          </button>
        ))}
        <span className="text-sm text-gray-500 font-medium ml-3">Platform:</span>
        {platforms.map((p) => (
          <button
            key={p}
            onClick={() => setSelectedPlatform(p)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition ${selectedPlatform === p ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary'}`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Calendar grid */}
      <Card title={`Content Items (${filtered.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Week</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Day</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Platform</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pillar</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Format</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const pillarMeta = contentPillarMeta[item.pillar];
                return (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 px-3 text-gray-500 text-xs">W{item.week}</td>
                    <td className="py-2.5 px-3 font-medium text-gray-700">{item.day}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{item.platform}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${pillarMeta.color}`}>
                        {pillarMeta.icon} {pillarMeta.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-800 font-medium max-w-xs">{item.title}</td>
                    <td className="py-2.5 px-3 text-gray-500 text-xs">{item.format}</td>
                    <td className="py-2.5 px-3"><StatusBadge status={item.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pillar distribution */}
      <Card title="Pillar Distribution" subtitle="Balance across content pillars this month">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(Object.entries(contentPillarMeta) as [ContentPillar, typeof contentPillarMeta[ContentPillar]][]).map(([key, meta]) => {
            const count = contentCalendar.filter((i) => i.pillar === key).length;
            return (
              <div key={key} className="text-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="text-2xl mb-1">{meta.icon}</div>
                <p className="text-xl font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500">{meta.label}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Platform distribution */}
      <Card title="Platform Mix" subtitle="Posts per platform this month">
        <div className="space-y-2">
          {['Instagram', 'LinkedIn', 'Blog', 'YouTube', 'WhatsApp'].map((platform) => {
            const count = contentCalendar.filter((i) => i.platform === platform).length;
            const pct = contentCalendar.length === 0 ? 0 : Math.round((count / contentCalendar.length) * 100);
            return (
              <div key={platform} className="flex items-center gap-3">
                <span className="w-24 text-xs text-gray-600">{platform}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                  <div className="bg-primary h-2.5 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 text-xs text-right text-gray-500">{count}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Tips */}
      <Card title="📌 Content Agent Tips">
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• Aim for at least one post per pillar per week to maintain brand breadth.</li>
          <li>• Instagram Reels and video content consistently outperform static posts — prioritise video for social proof and product education pillars.</li>
          <li>• Batch-create content every Monday for the week ahead to avoid last-minute rushing.</li>
          <li>• Repurpose long-form blog content into 3–5 social posts per article for maximum reach.</li>
          <li>• Always include a CTA: &quot;Book now&quot; for conversion posts, &quot;Share this&quot; for education posts.</li>
        </ul>
      </Card>
    </div>
  );
}

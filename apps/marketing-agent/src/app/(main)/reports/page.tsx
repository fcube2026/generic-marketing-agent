import Card from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { northStarKpis, acquisitionKpis, activationKpis, retentionKpis } from '@/lib/data';
import ProgressBar from '@/components/ui/ProgressBar';

const statusColorMap: Record<string, string> = {
  'on-track': 'bg-green-100 text-green-700',
  'at-risk': 'bg-yellow-100 text-yellow-700',
  'behind': 'bg-red-100 text-red-700',
};

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* Weekly digest */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-green-800 mb-1">📊 Weekly Marketing Digest — Week of Apr 7, 2026</p>
        <p className="text-sm text-green-700">GMV is <strong>+18% MoM</strong> (₹8.24L). Patient CAC down to ₹285 — below ₹300 target for the first time. Provider count still at risk (148 vs 200 target). Referral rate growing slowly (9%).</p>
      </div>

      {/* North Star */}
      <Card title="North Star Metrics">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {northStarKpis.map((kpi) => (
            <div key={kpi.label} className={`p-4 rounded-lg border ${kpi.status === 'on-track' ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{kpi.icon}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColorMap[kpi.status]}`}>{kpi.status}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              <p className="text-sm text-gray-600 mt-1">{kpi.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">Target: {kpi.target} · {kpi.trend}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Acquisition */}
      <Card title="Acquisition KPIs" subtitle="CAC, ROAS, organic growth, and referrals">
        <div className="space-y-3">
          {acquisitionKpis.map((kpi) => (
            <div key={kpi.label} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <span className="text-xl shrink-0">{kpi.icon}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-800">{kpi.label}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{kpi.value}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColorMap[kpi.status]}`}>{kpi.status}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Target: {kpi.target} · {kpi.trend}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Activation */}
      <Card title="Activation KPIs" subtitle="First booking rate, onboarding completion">
        <div className="space-y-3">
          {activationKpis.map((kpi) => (
            <div key={kpi.label} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{kpi.icon}</span>
                  <p className="text-sm font-semibold text-gray-800">{kpi.label}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">{kpi.value}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColorMap[kpi.status]}`}>{kpi.status}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400">Target: {kpi.target} · {kpi.trend}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Retention */}
      <Card title="Retention KPIs" subtitle="D30, D90 retention and repeat booking rate">
        <div className="space-y-4">
          {retentionKpis.map((kpi) => (
            <div key={kpi.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{kpi.icon}</span>
                  <p className="text-sm font-semibold text-gray-700">{kpi.label}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">{kpi.value}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColorMap[kpi.status]}`}>{kpi.status}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-1">Target: {kpi.target} · {kpi.trend}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Funnel */}
      <Card title="Conversion Funnel" subtitle="Patient acquisition funnel (weekly snapshot)">
        <div className="space-y-3">
          {[
            { stage: 'Landing Page Visits', count: '18,400', pct: 100 },
            { stage: 'App / Web Signup Started', count: '3,680', pct: 20 },
            { stage: 'Signup Completed', count: '2,576', pct: 14 },
            { stage: 'Profile Completed', count: '2,086', pct: 11.3 },
            { stage: 'Booking Search', count: '1,460', pct: 7.9 },
            { stage: 'Provider Selected', count: '916', pct: 4.9 },
            { stage: 'Booking Initiated', count: '734', pct: 3.9 },
            { stage: 'Payment Completed', count: '588', pct: 3.2 },
            { stage: 'Booking Completed', count: '441', pct: 2.4 },
          ].map((row) => (
            <div key={row.stage} className="flex items-center gap-3">
              <span className="w-52 text-xs text-gray-600 shrink-0">{row.stage}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-3">
                <div className="bg-primary h-3 rounded-full" style={{ width: `${row.pct}%` }} />
              </div>
              <span className="w-16 text-xs text-right text-gray-700 font-semibold">{row.count}</span>
              <span className="w-10 text-xs text-right text-gray-400">{row.pct}%</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Reporting cadence */}
      <Card title="Reporting Cadence" subtitle="What gets reported and when">
        <div className="space-y-3">
          {[
            { frequency: 'Daily', items: ['Channel spend vs budget', 'Bookings completed', 'App installs / signups'], icon: '📅' },
            { frequency: 'Weekly', items: ['CAC by channel', 'Booking conversion rate', 'Content performance (reach, engagement)', 'Running experiment status'], icon: '📊' },
            { frequency: 'Monthly', items: ['Full funnel report', 'Cohort retention analysis', 'Channel comparison', 'Experiment results', 'Budget reallocation decision'], icon: '📈' },
            { frequency: 'Quarterly', items: ['Strategy review vs OKRs', 'Competitive landscape update', 'Plan for next quarter', 'Experiment backlog review'], icon: '📋' },
          ].map((row) => (
            <div key={row.frequency} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{row.icon}</span>
                <p className="text-sm font-semibold text-gray-800">{row.frequency}</p>
              </div>
              <ul className="space-y-1">
                {row.items.map((item) => (
                  <li key={item} className="text-xs text-gray-600 flex items-start gap-2">
                    <span className="text-gray-300 mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

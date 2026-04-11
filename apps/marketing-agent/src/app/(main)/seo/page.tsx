import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { StatusBadge } from '@/components/ui/Badge';
import { keywordClusters, seoPages } from '@/lib/data';

const typeColors: Record<string, string> = {
  transactional: 'bg-green-100 text-green-700',
  informational: 'bg-blue-100 text-blue-700',
  comparison: 'bg-yellow-100 text-yellow-700',
  'provider-side': 'bg-purple-100 text-purple-700',
};

const priorityColors: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
};

const difficultyColors: Record<string, string> = {
  High: 'text-red-600',
  Medium: 'text-yellow-600',
  Low: 'text-green-600',
};

const pageTypeColors: Record<string, string> = {
  'city-specialty': 'bg-purple-100 text-purple-700',
  'condition': 'bg-blue-100 text-blue-700',
  'blog': 'bg-green-100 text-green-700',
  'comparison': 'bg-yellow-100 text-yellow-700',
};

export default function SeoPage() {
  const totalKeywords = keywordClusters.reduce((sum, c) => sum + c.keywords.length, 0);
  const livePages = seoPages.filter((p) => p.status === 'live').length;
  const inProgressPages = seoPages.filter((p) => p.status === 'in-progress').length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Keyword Clusters', value: keywordClusters.length, icon: '🔑' },
          { label: 'Total Keywords Tracked', value: totalKeywords, icon: '📊' },
          { label: 'SEO Pages Live', value: livePages, icon: '✅' },
          { label: 'Pages In Progress', value: inProgressPages, icon: '🔧' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <span className="text-2xl">{s.icon}</span>
            <p className="text-2xl font-bold text-gray-900 mt-2">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Keyword Clusters */}
      <Card title="Keyword Clusters" subtitle="Grouped by intent type and priority">
        <div className="space-y-6">
          {keywordClusters.map((cluster) => (
            <div key={cluster.cluster}>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm font-semibold text-gray-800">{cluster.cluster}</h4>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[cluster.type]}`}>{cluster.type}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[cluster.priority]}`}>{cluster.priority} priority</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-1.5 px-2 text-xs text-gray-400 font-medium">Keyword</th>
                      <th className="text-left py-1.5 px-2 text-xs text-gray-400 font-medium">Search Volume</th>
                      <th className="text-left py-1.5 px-2 text-xs text-gray-400 font-medium">Difficulty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cluster.keywords.map((kw) => (
                      <tr key={kw.keyword} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 px-2 text-gray-800 font-mono text-xs">{kw.keyword}</td>
                        <td className="py-2 px-2 text-gray-600 text-xs">{kw.volume}</td>
                        <td className={`py-2 px-2 text-xs font-semibold ${difficultyColors[kw.difficulty]}`}>{kw.difficulty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* SEO Pages */}
      <Card title="SEO Pages" subtitle="Content SEO assets to build for organic acquisition">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">URL</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Target Keyword</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {seoPages.map((page) => (
                <tr key={page.url} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2.5 px-3 font-mono text-xs text-primary">{page.url}</td>
                  <td className="py-2.5 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pageTypeColors[page.type]}`}>{page.type}</span>
                  </td>
                  <td className="py-2.5 px-3 text-gray-600 text-xs">{page.targetKeyword}</td>
                  <td className="py-2.5 px-3"><StatusBadge status={page.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Schema & Technical */}
      <Card title="Technical SEO Checklist">
        <div className="space-y-2">
          {[
            { item: 'MedicalBusiness schema markup on provider profile pages', done: false },
            { item: 'Physician schema markup on individual doctor pages', done: false },
            { item: 'LocalBusiness schema on city landing pages', done: false },
            { item: 'Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1', done: false },
            { item: 'XML sitemap submitted to Google Search Console', done: true },
            { item: 'Canonical tags on all paginated and filter pages', done: false },
            { item: 'Hreflang tags if expanding to regional languages', done: false },
            { item: 'Internal linking between city pages and blog content', done: false },
            { item: 'Google Search Console property set up and verified', done: true },
            { item: 'Mobile-first responsive design on all SEO pages', done: true },
          ].map((row) => (
            <div key={row.item} className="flex items-center gap-3 py-1.5">
              <span className={row.done ? 'text-green-500' : 'text-gray-300'}>{row.done ? '✅' : '⬜'}</span>
              <span className={`text-sm ${row.done ? 'text-gray-600' : 'text-gray-800'}`}>{row.item}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Content SEO Tips */}
      <Card title="📌 SEO Agent Guidance">
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• <strong>Prioritise transactional cluster first</strong> — these drive bookings. Publish city + specialty landing pages before blog content.</li>
          <li>• <strong>Each SEO page needs: </strong> unique H1 with primary keyword, 300+ words, internal links to 2+ related pages, schema markup.</li>
          <li>• <strong>Blog posts:</strong> 1,500–3,000 words, structured with H2/H3, include FAQ schema for featured snippets.</li>
          <li>• <strong>Track rankings weekly</strong> in Google Search Console or Ahrefs. Flag any page losing 3+ positions week-on-week.</li>
          <li>• <strong>Build backlinks</strong> through health media outreach and provider partnerships mentioning curex24.</li>
        </ul>
      </Card>
    </div>
  );
}

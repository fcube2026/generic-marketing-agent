'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  marketingSkills,
  marketingSkillCategories,
  notApplicableSkillCategory,
  type MarketingSkill,
  type MarketingSkillCategory,
} from '@/lib/data';

type CategoryFilter = MarketingSkillCategory | 'All';

const CATEGORY_ICON: Record<MarketingSkillCategory, string> = {
  'Conversion Optimization': '📈',
  'Content & Copy': '✍️',
  'SEO & Discovery': '🔍',
  'Paid & Distribution': '💸',
  'Measurement & Testing': '🧪',
  'Retention': '🛡️',
  'Growth Engineering': '🛠️',
  'Strategy & Monetization': '🎯',
  'Sales & RevOps': '🤝',
  'Not Applicable': '🗂️',
};

function SkillCard({ skill, onUse }: { skill: MarketingSkill; onUse: (s: MarketingSkill) => void }) {
  return (
    <div className="group bg-white border border-gray-200 rounded-xl p-5 flex flex-col hover:border-primary hover:shadow-md transition">
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xl shrink-0"
          aria-hidden="true"
        >
          {skill.icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 leading-tight">{skill.name}</h3>
          <p className="text-[11px] text-gray-400 mt-0.5 font-mono truncate">{skill.id}</p>
        </div>
      </div>
      <p className="text-xs text-gray-600 leading-relaxed mb-4 flex-1">{skill.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
          {skill.category}
        </span>
        <button
          type="button"
          onClick={() => onUse(skill)}
          className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition"
        >
          Use skill →
        </button>
      </div>
    </div>
  );
}

export default function SkillsPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');
  const [showNotApplicable, setShowNotApplicable] = useState(false);

  // Skills shown by default — everything except the "Not Applicable" bucket.
  const relevantSkills = useMemo(
    () => marketingSkills.filter((s) => s.category !== notApplicableSkillCategory),
    [],
  );
  const notApplicableSkills = useMemo(
    () => marketingSkills.filter((s) => s.category === notApplicableSkillCategory),
    [],
  );

  function matchesQuery(s: MarketingSkill, q: string) {
    if (!q) return true;
    return (
      s.id.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    );
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return relevantSkills.filter((s) => {
      if (activeCategory !== 'All' && s.category !== activeCategory) return false;
      return matchesQuery(s, q);
    });
  }, [query, activeCategory, relevantSkills]);

  const grouped = useMemo(() => {
    const map = new Map<MarketingSkillCategory, MarketingSkill[]>();
    for (const cat of marketingSkillCategories) map.set(cat, []);
    for (const s of filtered) {
      map.get(s.category)?.push(s);
    }
    return Array.from(map.entries()).filter(([, list]) => list.length > 0);
  }, [filtered]);

  // Filter the Not Applicable bucket by the same search query so it stays
  // useful when expanded, but it never appears in the category chips above.
  const filteredNotApplicable = useMemo(() => {
    if (!showNotApplicable) return [];
    const q = query.trim().toLowerCase();
    return notApplicableSkills.filter((s) => matchesQuery(s, q));
  }, [showNotApplicable, query, notApplicableSkills]);

  function useSkill(skill: MarketingSkill) {
    const params = new URLSearchParams({ skill: skill.id });
    router.push(`/agent?${params.toString()}`);
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: relevantSkills.length };
    for (const cat of marketingSkillCategories) {
      c[cat] = relevantSkills.filter((s) => s.category === cat).length;
    }
    return c;
  }, [relevantSkills]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <header className="space-y-2">
        <p className="text-xs font-semibold text-primary uppercase tracking-wide">Skills Library</p>
        <h1 className="text-2xl font-extrabold text-gray-900">
          {relevantSkills.length} marketing skills your AI agent can run
        </h1>
        <p className="text-sm text-gray-500 max-w-2xl">
          Each skill is a specialised workflow — frameworks, prompts, and best practices — your AI Marketing
          Agent uses to handle a specific marketing task. Browse, search, or click <strong>Use skill</strong>{' '}
          to launch it in the agent with a ready-to-go prompt.
          {notApplicableSkills.length > 0 && (
            <>
              {' '}
              <span className="text-gray-400">
                ({notApplicableSkills.length} additional skills are hidden under{' '}
                <strong>Not Applicable</strong> at the bottom — expand only if you need them.)
              </span>
            </>
          )}
        </p>
      </header>

      {/* Search */}
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search skills (e.g. seo, email, churn, pricing)…"
          className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          aria-label="Search marketing skills"
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
          🔎
        </span>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory('All')}
          className={`text-xs px-3 py-1.5 rounded-full border transition font-medium ${
            activeCategory === 'All'
              ? 'bg-primary text-white border-primary'
              : 'bg-white border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
          }`}
        >
          All ({counts.All})
        </button>
        {marketingSkillCategories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`text-xs px-3 py-1.5 rounded-full border transition font-medium ${
              activeCategory === cat
                ? 'bg-primary text-white border-primary'
                : 'bg-white border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
            }`}
          >
            {CATEGORY_ICON[cat]} {cat} ({counts[cat]})
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-sm text-gray-500">
          No skills match your search. Try a different keyword or clear filters.
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([cat, list]) => (
            <section key={cat} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-base" aria-hidden="true">{CATEGORY_ICON[cat]}</span>
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{cat}</h2>
                <span className="text-xs text-gray-400">({list.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((s) => (
                  <SkillCard key={s.id} skill={s} onUse={useSkill} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Not Applicable — collapsed by default. Cards are only mounted/loaded
          when the user explicitly expands the section. */}
      {notApplicableSkills.length > 0 && (
        <section className="pt-6 border-t border-dashed border-gray-200">
          <button
            type="button"
            onClick={() => setShowNotApplicable((v) => !v)}
            aria-expanded={showNotApplicable}
            aria-controls="not-applicable-skills"
            className="w-full flex items-center justify-between gap-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-left transition"
          >
            <span className="flex items-center gap-2">
              <span className="text-base" aria-hidden="true">
                {CATEGORY_ICON[notApplicableSkillCategory]}
              </span>
              <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Not Applicable
              </span>
              <span className="text-xs text-gray-400">({notApplicableSkills.length})</span>
            </span>
            <span className="flex items-center gap-2 text-xs text-gray-500">
              <span className="hidden sm:inline">
                {showNotApplicable ? 'Hide' : 'Show'} skills not aligned with curex24&apos;s current focus
              </span>
              <span aria-hidden="true" className="text-gray-400">
                {showNotApplicable ? '▾' : '▸'}
              </span>
            </span>
          </button>

          {showNotApplicable && (
            <div id="not-applicable-skills" className="mt-4 space-y-3">
              <p className="text-xs text-gray-500 max-w-2xl">
                These skills are hidden by default because they don&apos;t fit curex24&apos;s current B2C
                home-doctor / care-plan motion (B2B-only outreach, comparison pages, generic free tools, etc.).
                Use them only if your situation changes.
              </p>
              {filteredNotApplicable.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-500">
                  No Not Applicable skills match your search.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredNotApplicable.map((s) => (
                    <SkillCard key={s.id} skill={s} onUse={useSkill} />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

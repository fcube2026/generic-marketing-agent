'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  marketingSkills,
  marketingSkillCategories,
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
  'Retention': '🔄',
  'Growth Engineering': '🛠️',
  'Strategy & Monetization': '🎯',
  'Sales & RevOps': '🤝',
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return marketingSkills.filter((s) => {
      if (activeCategory !== 'All' && s.category !== activeCategory) return false;
      if (!q) return true;
      return (
        s.id.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    });
  }, [query, activeCategory]);

  const grouped = useMemo(() => {
    const map = new Map<MarketingSkillCategory, MarketingSkill[]>();
    for (const cat of marketingSkillCategories) map.set(cat, []);
    for (const s of filtered) {
      map.get(s.category)?.push(s);
    }
    return Array.from(map.entries()).filter(([, list]) => list.length > 0);
  }, [filtered]);

  function useSkill(skill: MarketingSkill) {
    const params = new URLSearchParams({ skill: skill.id });
    router.push(`/agent?${params.toString()}`);
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: marketingSkills.length };
    for (const cat of marketingSkillCategories) {
      c[cat] = marketingSkills.filter((s) => s.category === cat).length;
    }
    return c;
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <header className="space-y-2">
        <p className="text-xs font-semibold text-primary uppercase tracking-wide">Skills Library</p>
        <h1 className="text-2xl font-extrabold text-gray-900">
          {marketingSkills.length} marketing skills your AI agent can run
        </h1>
        <p className="text-sm text-gray-500 max-w-2xl">
          Each skill is a specialised workflow — frameworks, prompts, and best practices — your AI Marketing
          Agent uses to handle a specific marketing task. Browse, search, or click <strong>Use skill</strong>{' '}
          to launch it in the agent with a ready-to-go prompt.
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
    </div>
  );
}

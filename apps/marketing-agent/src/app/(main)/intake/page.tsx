'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import { intakeQuestions } from '@/lib/data';
import {
  getIntakeResponses,
  saveIntakeResponses,
} from '@/lib/services/marketingService';

const tierLabels: Record<number, { label: string; desc: string; color: string }> = {
  1: { label: 'Tier 1 — Mandatory', desc: 'Core business questions (must complete)', color: 'bg-red-50 border-red-200 text-red-700' },
  2: { label: 'Tier 2 — Strategy Inputs', desc: 'Audience and positioning questions', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  3: { label: 'Tier 3 — Ongoing', desc: 'Quarterly review questions', color: 'bg-blue-50 border-blue-200 text-blue-700' },
};

export default function IntakePage() {
  const [answers, setAnswers] = useState<Record<string, string | string[] | boolean | number>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getIntakeResponses()
      .then((data) => {
        if (!cancelled) setAnswers(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load intake responses');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tier1 = intakeQuestions.filter((q) => q.tier === 1);
  const tier2 = intakeQuestions.filter((q) => q.tier === 2);
  const tier3 = intakeQuestions.filter((q) => q.tier === 3);

  const allTier1Answered = tier1.every((q) => {
    const ans = answers[q.id];
    if (q.type === 'multiselect') return Array.isArray(ans) && (ans as string[]).length > 0;
    return ans !== undefined && ans !== '' && ans !== null;
  });

  function handleText(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function handleSelect(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function handleMultiselect(id: string, option: string) {
    setAnswers((prev) => {
      const current = (prev[id] as string[]) || [];
      const updated = current.includes(option)
        ? current.filter((v) => v !== option)
        : [...current, option];
      return { ...prev, [id]: updated };
    });
  }

  function handleBoolean(id: string, value: boolean) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await saveIntakeResponses(answers);
      setAnswers(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save answers');
    } finally {
      setSaving(false);
    }
  }

  function renderQuestion(q: (typeof intakeQuestions)[0]) {
    if (q.type === 'select') {
      return (
        <div className="space-y-2">
          {(q.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-primary cursor-pointer transition">
              <input
                type="radio"
                name={q.id}
                value={opt}
                checked={answers[q.id] === opt}
                onChange={() => handleSelect(q.id, opt)}
                className="accent-primary"
              />
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      );
    }

    if (q.type === 'multiselect') {
      const selected = (answers[q.id] as string[]) || [];
      return (
        <div className="flex flex-wrap gap-2">
          {(q.options ?? []).map((opt) => (
            <button
              key={opt}
              onClick={() => handleMultiselect(q.id, opt)}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                selected.includes(opt)
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      );
    }

    if (q.type === 'boolean') {
      return (
        <div className="flex gap-3">
          {['Yes', 'No'].map((opt) => (
            <button
              key={opt}
              onClick={() => handleBoolean(q.id, opt === 'Yes')}
              className={`px-6 py-2 rounded-lg border text-sm font-medium transition ${
                answers[q.id] === (opt === 'Yes')
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      );
    }

    if (q.type === 'textarea') {
      return (
        <textarea
          rows={3}
          placeholder={q.placeholder}
          value={(answers[q.id] as string) ?? ''}
          onChange={(e) => handleText(q.id, e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
        />
      );
    }

    if (q.type === 'number') {
      return (
        <input
          type="number"
          placeholder={q.placeholder}
          value={(answers[q.id] as string) ?? ''}
          onChange={(e) => handleText(q.id, e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      );
    }

    return (
      <input
        type="text"
        placeholder={q.placeholder}
        value={(answers[q.id] as string) ?? ''}
        onChange={(e) => handleText(q.id, e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      />
    );
  }

  function renderSection(questions: typeof intakeQuestions, tier: 1 | 2 | 3) {
    const meta = tierLabels[tier];
    const answeredCount = questions.filter((q) => {
      const ans = answers[q.id];
      if (q.type === 'multiselect') return Array.isArray(ans) && (ans as string[]).length > 0;
      return ans !== undefined && ans !== '';
    }).length;

    return (
      <Card
        key={tier}
        title={meta.label}
        subtitle={`${meta.desc} · ${answeredCount}/${questions.length} answered`}
        className="mb-6"
      >
        <div className="space-y-6">
          {questions.map((q, idx) => (
            <div key={q.id}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {idx + 1}. {q.question}
              </label>
              {renderQuestion(q)}
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-700">
        <strong>📋 Business Intake Questionnaire</strong>
        <p className="mt-1">Answer these questions to personalise your full marketing strategy, channel recommendations, and content calendar. Tier 1 is mandatory; Tiers 2 and 3 add depth.</p>
      </div>

      {loading && <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {!loading && (
        <>
          {renderSection(tier1, 1)}
          {renderSection(tier2, 2)}
          {renderSection(tier3, 3)}

          <div className="flex items-center justify-between py-2">
            <p className="text-sm text-gray-500">
              {allTier1Answered ? '✅ Tier 1 complete — strategy is personalised.' : '⚠️ Complete Tier 1 to unlock personalised strategy.'}
            </p>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark transition disabled:opacity-50"
            >
              {saving ? 'Saving…' : saved ? '✅ Saved!' : 'Save Answers'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

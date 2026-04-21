'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { marketingSkills, type MarketingSkill } from '@/lib/data';
import { getAdvancedSkillConfig } from '@/lib/skills/registry';
import {
  runSkill,
  critiqueSkillRun,
  extractJsonBlock,
  type SkillRunResult,
} from '@/lib/skills/runner';
import type {
  AdvancedSkillConfig,
  SkillCritique,
  SkillInput,
  SkillInputValue,
} from '@/lib/skills/types';
import { describeAiError } from '@/lib/services/aiService';
import { createPlanItem } from '@/lib/services/marketingService';
import { GeneratedImage } from '@/components/ui/GeneratedImage';

type ArtifactTab = 'brief' | 'output' | 'json' | 'visual' | 'critique' | 'context';

function defaultValueFor(input: SkillInput): SkillInputValue {
  if (input.defaultValue !== undefined) return input.defaultValue;
  switch (input.type) {
    case 'multiselect':
      return [];
    case 'boolean':
      return false;
    case 'number':
      return 0;
    default:
      return '';
  }
}

function buildInitialValues(config: AdvancedSkillConfig): Record<string, SkillInputValue> {
  const out: Record<string, SkillInputValue> = {};
  for (const i of config.inputs) out[i.name] = defaultValueFor(i);
  return out;
}

function validateInputs(
  config: AdvancedSkillConfig,
  values: Record<string, SkillInputValue>,
): string | null {
  for (const i of config.inputs) {
    if (!i.required) continue;
    const v = values[i.name];
    if (v === undefined || v === null) return `${i.label} is required`;
    if (typeof v === 'string' && v.trim().length === 0) return `${i.label} is required`;
    if (Array.isArray(v) && v.length === 0) return `${i.label} is required`;
  }
  return null;
}

// ─── Input field renderer ────────────────────────────────────────────────────

function InputField({
  input,
  value,
  onChange,
}: {
  input: SkillInput;
  value: SkillInputValue;
  onChange: (next: SkillInputValue) => void;
}) {
  const baseInput =
    'w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';

  if (input.type === 'textarea') {
    return (
      <textarea
        className={`${baseInput} min-h-[90px] font-mono text-xs`}
        value={String(value ?? '')}
        maxLength={input.maxLength}
        placeholder={input.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (input.type === 'select') {
    return (
      <select className={baseInput} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
        {!input.required && <option value="">— choose —</option>}
        {(input.options ?? []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }
  if (input.type === 'multiselect') {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="flex flex-wrap gap-2">
        {(input.options ?? []).map((opt) => {
          const on = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(on ? selected.filter((s) => s !== opt) : [...selected, opt])}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition ${
                on
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-primary'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  }
  if (input.type === 'boolean') {
    return (
      <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        Yes
      </label>
    );
  }
  if (input.type === 'number') {
    return (
      <input
        type="number"
        className={baseInput}
        value={Number.isFinite(value as number) ? (value as number) : ''}
        placeholder={input.placeholder}
        onChange={(e) => {
          const n = e.target.value === '' ? 0 : Number(e.target.value);
          onChange(Number.isNaN(n) ? 0 : n);
        }}
      />
    );
  }
  // text / url
  return (
    <input
      type={input.type === 'url' ? 'url' : 'text'}
      className={baseInput}
      value={String(value ?? '')}
      placeholder={input.placeholder}
      maxLength={input.maxLength}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SkillRunnerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const skillId = params?.id;

  const skill = useMemo<MarketingSkill | undefined>(
    () => marketingSkills.find((s) => s.id === skillId),
    [skillId],
  );
  const config = useMemo<AdvancedSkillConfig | undefined>(
    () => (skillId ? getAdvancedSkillConfig(skillId) : undefined),
    [skillId],
  );

  const [values, setValues] = useState<Record<string, SkillInputValue>>(() =>
    config ? buildInitialValues(config) : {},
  );
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SkillRunResult | null>(null);
  const [tab, setTab] = useState<ArtifactTab>('output');
  const [critique, setCritique] = useState<SkillCritique | null>(null);
  const [critiquing, setCritiquing] = useState(false);
  const [critiqueError, setCritiqueError] = useState<string | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planSaved, setPlanSaved] = useState<number | null>(null);
  const [planSaveError, setPlanSaveError] = useState<string | null>(null);

  // Re-init form values whenever the skill changes (deep navigation).
  useEffect(() => {
    if (config) setValues(buildInitialValues(config));
    setResult(null);
    setCritique(null);
    setError(null);
    setCritiqueError(null);
    setPlanSaved(null);
  }, [config, skillId]);

  if (!skillId || !skill || !config) {
    return (
      <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-xl p-10 text-center">
        <p className="text-sm text-gray-600">Skill not found.</p>
        <Link href="/skills" className="text-sm text-primary font-semibold mt-4 inline-block">
          ← Back to Skills Library
        </Link>
      </div>
    );
  }

  const jsonBlock = result ? extractJsonBlock(result.reply) : null;

  async function onRun() {
    if (!skill || !config) return;
    setError(null);
    setCritique(null);
    setCritiqueError(null);
    setPlanSaved(null);
    const validationError = validateInputs(config, values);
    if (validationError) {
      setError(validationError);
      return;
    }
    setRunning(true);
    try {
      const r = await runSkill({
        skillId: skill.id,
        skillName: skill.name,
        config,
        inputs: values,
      });
      setResult(r);
      setTab('output');
    } catch (err) {
      setError(describeAiError(err, 'Skill run failed'));
    } finally {
      setRunning(false);
    }
  }

  async function onCritique() {
    if (!skill || !config || !result) return;
    setCritiqueError(null);
    setCritiquing(true);
    try {
      const c = await critiqueSkillRun({
        skillName: skill.name,
        output: result.reply,
        rubric: config.successCriteria,
      });
      setCritique(c);
      if (c) setTab('critique');
    } catch (err) {
      setCritiqueError(describeAiError(err, 'Critique failed'));
    } finally {
      setCritiquing(false);
    }
  }

  async function onSaveToPlan() {
    if (!skill || !result) return;
    setPlanSaveError(null);
    setSavingPlan(true);
    try {
      const summary = result.reply.slice(0, 280).replace(/\s+/g, ' ').trim();
      const created = await createPlanItem({
        phase: '1-30',
        category: skill.category,
        task: `[${skill.name}] ${summary}`,
        owner: 'Marketing',
        done: false,
      });
      setPlanSaved(created ? 1 : 0);
    } catch (err) {
      setPlanSaveError(describeAiError(err, 'Failed to save to plan'));
    } finally {
      setSavingPlan(false);
    }
  }

  function copyToClipboard(text: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {
        /* ignore */
      });
    }
  }

  function downloadFile(filename: string, content: string, mime = 'text/plain') {
    if (typeof window === 'undefined') return;
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link href="/skills" className="text-xs text-gray-500 hover:text-primary">
            ← Skills Library
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <span
              className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xl"
              aria-hidden="true"
            >
              {skill.icon}
            </span>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">{skill.name}</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                <span className="font-mono">{skill.id}</span> · {skill.category}
                {config.tier && (
                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 uppercase text-[10px] font-bold">
                    {config.tier}
                  </span>
                )}
                {config.model && (
                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-mono">
                    {config.model}
                  </span>
                )}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-3 max-w-2xl">{skill.description}</p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/agent?skill=${skill.id}`)}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-primary hover:text-primary transition shrink-0"
        >
          Open in chat instead →
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Brief form */}
        <section className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 space-y-4 self-start">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-primary font-bold">Step 1 · Brief</p>
            <h2 className="text-sm font-semibold text-gray-900">Tell the agent what you need</h2>
          </div>
          <div className="space-y-4">
            {config.inputs.map((input) => (
              <div key={input.name} className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
                  {input.label}
                  {input.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <InputField
                  input={input}
                  value={values[input.name] ?? defaultValueFor(input)}
                  onChange={(next) => setValues((prev) => ({ ...prev, [input.name]: next }))}
                />
                {input.helper && <p className="text-[11px] text-gray-400">{input.helper}</p>}
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={onRun}
            disabled={running}
            className="w-full text-sm px-4 py-2.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {running ? 'Running skill…' : '▶ Run skill'}
          </button>

          <div className="text-[11px] text-gray-400 leading-relaxed">
            We auto-inject your business profile + the latest KPIs into the prompt so the agent&apos;s output
            is grounded in real curex24 data.
          </div>
        </section>

        {/* Artifact area */}
        <section className="lg:col-span-3 bg-white border border-gray-200 rounded-xl flex flex-col min-h-[500px]">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-primary font-bold">
                Step 2 · Artifact
              </p>
              <h2 className="text-sm font-semibold text-gray-900">
                {result ? 'Generated output' : 'Run the skill to see results'}
              </h2>
            </div>
            {result && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCritique}
                  disabled={critiquing || !config.successCriteria?.length}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:border-primary hover:text-primary transition disabled:opacity-50"
                >
                  {critiquing ? 'Grading…' : '✓ Grade output'}
                </button>
                <button
                  type="button"
                  onClick={onSaveToPlan}
                  disabled={savingPlan}
                  className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition disabled:opacity-50"
                >
                  {savingPlan ? 'Saving…' : '💾 Save to Plan'}
                </button>
              </div>
            )}
          </div>

          {!result ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400 px-6 text-center">
              Fill in the brief on the left and press <strong className="mx-1">Run skill</strong>.
              <br />
              Output will appear here as a structured artifact you can copy, download, grade, and save to your plan.
            </div>
          ) : (
            <>
              <nav className="flex gap-1 px-3 pt-3 border-b border-gray-100 overflow-x-auto">
                {(
                  [
                    { id: 'output', label: 'Output' },
                    ...(jsonBlock ? [{ id: 'json' as const, label: 'JSON spec' }] : []),
                    ...(result.visualPrompt ? [{ id: 'visual' as const, label: 'Visual' }] : []),
                    { id: 'brief', label: 'Final prompt' },
                    { id: 'context', label: 'Org context' },
                    ...(critique ? [{ id: 'critique' as const, label: `Critique · ${critique.overallScore}/100` }] : []),
                  ] as Array<{ id: ArtifactTab; label: string }>
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`text-xs px-3 py-1.5 rounded-t-lg font-medium transition ${
                      tab === t.id
                        ? 'bg-primary/10 text-primary border-b-2 border-primary'
                        : 'text-gray-500 hover:text-primary'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>

              <div className="flex-1 overflow-auto p-5 space-y-4">
                {tab === 'output' && (
                  <div className="space-y-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(result.reply)}
                        className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:border-primary hover:text-primary"
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadFile(`${skill.id}.md`, result.reply, 'text/markdown')}
                        className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:border-primary hover:text-primary"
                      >
                        Download .md
                      </button>
                    </div>
                    <pre className="text-xs leading-relaxed text-gray-800 whitespace-pre-wrap font-sans bg-gray-50 border border-gray-100 rounded-lg p-4">
                      {result.reply}
                    </pre>
                    <p className="text-[11px] text-gray-400 text-right">
                      model: <span className="font-mono">{result.model}</span>
                    </p>
                  </div>
                )}

                {tab === 'json' && jsonBlock && (
                  <div className="space-y-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(jsonBlock)}
                        className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:border-primary hover:text-primary"
                      >
                        Copy JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadFile(`${skill.id}.json`, jsonBlock, 'application/json')}
                        className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:border-primary hover:text-primary"
                      >
                        Download .json
                      </button>
                    </div>
                    <pre className="text-xs leading-relaxed text-gray-800 whitespace-pre-wrap font-mono bg-gray-50 border border-gray-100 rounded-lg p-4">
                      {jsonBlock}
                    </pre>
                  </div>
                )}

                {tab === 'visual' && result.visualPrompt && (
                  <div className="space-y-3">
                    <GeneratedImage
                      prompt={result.visualPrompt}
                      width={result.visualSize?.width}
                      height={result.visualSize?.height}
                      label={`${skill.name} — sample visual`}
                    />
                    <p className="text-[11px] text-gray-400 font-mono">
                      visual prompt: {result.visualPrompt}
                    </p>
                  </div>
                )}

                {tab === 'brief' && (
                  <pre className="text-xs leading-relaxed text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 border border-gray-100 rounded-lg p-4">
                    {result.prompt}
                  </pre>
                )}

                {tab === 'context' && (
                  <div className="space-y-2">
                    <pre className="text-xs leading-relaxed text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 border border-gray-100 rounded-lg p-4 max-h-[400px] overflow-auto">
                      {result.orgContext?.text || '(no org context loaded)'}
                    </pre>
                    {result.orgContext?.errors?.length ? (
                      <p className="text-[11px] text-yellow-700">
                        {result.orgContext.errors.length} context source(s) failed to load:{' '}
                        {result.orgContext.errors.join('; ')}
                      </p>
                    ) : null}
                  </div>
                )}

                {tab === 'critique' && critique && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl font-extrabold text-primary">{critique.overallScore}</div>
                      <div className="text-xs text-gray-500">/ 100 — weighted critic score</div>
                    </div>
                    <div className="space-y-2">
                      {critique.scores.map((s) => (
                        <div
                          key={s.id}
                          className="border border-gray-100 rounded-lg p-3 flex gap-3 items-start"
                        >
                          <div className="text-xs font-mono w-12 shrink-0 text-gray-700">{s.score}</div>
                          <div>
                            <p className="text-xs font-semibold text-gray-800">{s.id}</p>
                            <p className="text-xs text-gray-600">{s.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {critique.weakestSection && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-900">
                        <p className="font-semibold">Weakest section: {critique.weakestSection}</p>
                        <p className="mt-1">{critique.suggestion}</p>
                      </div>
                    )}
                  </div>
                )}

                {critiqueError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
                    {critiqueError}
                  </div>
                )}
                {planSaveError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
                    {planSaveError}
                  </div>
                )}
                {planSaved !== null && !planSaveError && (
                  <div className="bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg px-3 py-2">
                    Saved to your 90-day plan as a Phase 1 (1–30 day) item.
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

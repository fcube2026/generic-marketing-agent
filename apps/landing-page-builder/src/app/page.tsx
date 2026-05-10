'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  buildInitialValues,
  buildLandingPagePrompt,
  landingPageInputs,
  LANDING_PAGE_SYSTEM_PROMPT,
  LANDING_PAGE_WIZARD_STEPS,
  type LandingPageInput,
  type LandingPageValues,
  validateValues,
} from '@/lib/skillConfig';
import {
  extractHtmlBlock,
  extractJsonBlock,
  publishLandingPagePreview,
  type PublishLandingPageResult,
} from '@/lib/services/landingPageService';

type Tab = 'output' | 'html' | 'schema' | 'prompt';

interface ChatResult {
  reply: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

function InputField({
  input,
  value,
  onChange,
}: {
  input: LandingPageInput;
  value: string | string[];
  onChange: (next: string | string[]) => void;
}) {
  const baseInput =
    'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30';

  if (input.type === 'textarea') {
    return (
      <textarea
        className={`${baseInput} min-h-[120px] resize-y`}
        value={String(value ?? '')}
        placeholder={input.placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (input.type === 'select') {
    return (
      <select className={baseInput} value={String(value ?? '')} onChange={(event) => onChange(event.target.value)}>
        {(input.options ?? []).map((option) => (
          <option key={option} value={option} className="text-slate-900">
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (input.type === 'multiselect') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="flex flex-wrap gap-2">
        {(input.options ?? []).map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() =>
                onChange(active ? selected.filter((item) => item !== option) : [...selected, option])
              }
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? 'border-primary bg-primary text-white'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-primary/50 hover:text-white'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <input
      type="text"
      className={baseInput}
      value={String(value ?? '')}
      placeholder={input.placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export default function HomePage() {
  const [values, setValues] = useState<LandingPageValues>(buildInitialValues);
  const [stepIndex, setStepIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChatResult | null>(null);
  const [tab, setTab] = useState<Tab>('output');
  const [publishing, setPublishing] = useState(false);
  const [preview, setPreview] = useState<PublishLandingPageResult | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const currentStep = LANDING_PAGE_WIZARD_STEPS[stepIndex];
  const inputsByName = useMemo(
    () =>
      landingPageInputs.reduce<Record<string, LandingPageInput>>((acc, input) => {
        acc[input.name] = input;
        return acc;
      }, {}),
    [],
  );
  const completedSteps = useMemo(
    () =>
      LANDING_PAGE_WIZARD_STEPS.filter((step) =>
        step.inputNames.every((name) => {
          const value = values[name as keyof LandingPageValues];
          return Array.isArray(value) ? value.length > 0 : String(value ?? '').trim().length > 0;
        }),
      ).length,
    [values],
  );
  const stepProgressPercent = Math.round((completedSteps / LANDING_PAGE_WIZARD_STEPS.length) * 100);
  const prompt = useMemo(() => buildLandingPagePrompt(values), [values]);
  const htmlBlock = useMemo(() => (result ? extractHtmlBlock(result.reply) : null), [result]);
  const jsonBlock = useMemo(() => (result ? extractJsonBlock(result.reply) : null), [result]);
  const validationError = useMemo(() => validateValues(values), [values]);

  useEffect(() => {
    if (!htmlBlock) {
      setPreview(null);
      setPublishError(null);
      return;
    }

    let cancelled = false;
    setPreview(null);
    setPublishError(null);
    setPublishing(true);

    (async () => {
      try {
        const published = await publishLandingPagePreview({ html: htmlBlock });
        if (!cancelled) setPreview(published);
      } catch (publishErr) {
        if (!cancelled) {
          setPublishError(
            publishErr instanceof Error ? publishErr.message : 'Failed to publish landing page preview',
          );
        }
      } finally {
        if (!cancelled) setPublishing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [htmlBlock]);

  async function onBuild() {
    const nextError = validateValues(values);
    if (nextError) {
      setError(nextError);
      return;
    }

    setRunning(true);
    setError(null);
    setResult(null);
    setPreview(null);
    setPublishError(null);
    setTab('output');

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          system: LANDING_PAGE_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = (await response.json()) as ChatResult & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || 'Failed to build landing page');
      }

      setResult(data);
    } catch (runErr) {
      setError(runErr instanceof Error ? runErr.message : 'Failed to build landing page');
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.3),_transparent_38%),radial-gradient(circle_at_80%_22%,_rgba(34,211,238,0.16),_transparent_34%),linear-gradient(165deg,#020617_0%,#0b1120_34%,#131c31_100%)] px-4 py-10 text-white sm:px-6 lg:py-12">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -left-32 top-1/4 h-80 w-80 rounded-full bg-primary/25 blur-[130px]" />
        <div className="absolute right-0 top-10 h-72 w-72 rounded-full bg-cyan-400/20 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-8">
        <header className="rounded-[2rem] border border-white/15 bg-white/[0.04] px-6 py-7 shadow-[0_30px_90px_-45px_rgba(124,58,237,0.7)] backdrop-blur-xl sm:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr] lg:items-end">
            <div className="space-y-4">
              <span className="inline-flex rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-primary-light">
                Standalone premium studio
              </span>
              <div className="space-y-3">
                <h1 className="bg-gradient-to-r from-white via-primary-light to-cyan-200 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl lg:text-6xl">
                  Landing Page Builder
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">
                  Transform structured briefs into polished, conversion-ready landing pages with AI, then instantly publish a shareable live preview link.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-2 text-xs text-slate-200">
                  <p className="font-semibold text-white">Guided workflow</p>
                  <p className="mt-0.5 text-slate-400">Brief → Build → Share</p>
                </div>
                <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs text-primary-light">
                  <p className="font-semibold text-white">{stepProgressPercent}% complete</p>
                  <p className="mt-0.5 text-primary-light/80">{completedSteps} of {LANDING_PAGE_WIZARD_STEPS.length} steps finished</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4 text-sm text-slate-300">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-light">Live workflow state</p>
              <div className="mt-4 space-y-2">
                <p>
                  Active step:{' '}
                  <span className="font-semibold text-white">
                    {stepIndex + 1}. {currentStep.title}
                  </span>
                </p>
                <p>
                  Output status:{' '}
                  <span className="font-semibold text-white">{result ? 'Generated' : 'Waiting for build'}</span>
                </p>
                <p>
                  Preview status:{' '}
                  <span className="font-semibold text-white">{preview ? 'Published' : publishing ? 'Publishing' : 'Not published yet'}</span>
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_1.35fr]">
          <section className="rounded-[2rem] border border-white/15 bg-white/[0.05] p-5 shadow-[0_18px_50px_-26px_rgba(15,23,42,0.9)] backdrop-blur-xl sm:p-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-light">Step 1 · Brief</p>
                  <h2 className="mt-2 text-xl font-bold text-white">Craft your page strategy</h2>
                  <p className="mt-1 text-sm text-slate-400">Define goals, offer, audience, and proof in a guided sequence.</p>
                </div>
                <div className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-slate-300">
                  {completedSteps}/{LANDING_PAGE_WIZARD_STEPS.length} complete
                </div>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-300 transition-all"
                  style={{ width: `${stepProgressPercent}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {LANDING_PAGE_WIZARD_STEPS.map((step, index) => {
                  const active = index === stepIndex;
                  const isCompleted = index < completedSteps;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setStepIndex(index)}
                      className={`rounded-2xl border px-3 py-3 text-left transition ${
                        active
                          ? 'border-primary/70 bg-primary/15 text-white shadow-[0_8px_30px_-18px_rgba(124,58,237,0.8)]'
                          : 'border-white/10 bg-black/20 text-slate-400 hover:border-primary/40 hover:text-white'
                      }`}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">
                        {String(index + 1).padStart(2, '0')}
                        {isCompleted ? ' · done' : ''}
                      </p>
                      <p className="mt-1 text-sm font-semibold">{step.title}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-slate-950/50 p-4 sm:p-5">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-white">{currentStep.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{currentStep.description}</p>
              </div>

              <div className="space-y-4">
                {currentStep.inputNames.map((inputName) => {
                  const input = inputsByName[inputName];
                  if (!input) return null;

                  return (
                    <div key={input.name} className="space-y-2">
                      <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                        {input.label}
                        {input.required ? <span className="ml-1 text-rose-400">*</span> : null}
                      </label>
                      <InputField
                        input={input}
                        value={values[input.name as keyof LandingPageValues] as string | string[]}
                        onChange={(next) =>
                          setValues((prev) => ({
                            ...prev,
                            [input.name]: next as never,
                          }))
                        }
                      />
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStepIndex((prev) => Math.max(prev - 1, 0))}
                  disabled={stepIndex === 0}
                  className="rounded-full border border-white/15 bg-black/20 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-primary/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStepIndex((prev) => Math.min(prev + 1, LANDING_PAGE_WIZARD_STEPS.length - 1))}
                  disabled={stepIndex === LANDING_PAGE_WIZARD_STEPS.length - 1}
                  className="rounded-full bg-gradient-to-r from-primary to-violet-500 px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>

            {error ? <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
            {validationError ? <p className="mt-4 text-xs text-slate-400">Missing required input: {validationError}</p> : null}

            <button
              type="button"
              onClick={onBuild}
              disabled={running}
              className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-primary to-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_38px_-20px_rgba(124,58,237,0.9)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? 'Building landing page…' : 'Build landing page'}
            </button>
          </section>

          <section className="flex min-h-[720px] flex-col rounded-[2rem] border border-white/15 bg-white/[0.05] shadow-[0_18px_50px_-26px_rgba(15,23,42,0.9)] backdrop-blur-xl">
            <div className="border-b border-white/10 px-5 py-4 sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-light">Step 2 · Output</p>
              <h2 className="mt-2 text-xl font-bold text-white">Preview, code, schema, and prompt</h2>
              <p className="mt-1 text-sm text-slate-400">Inspect generated assets, copy deliverables, and open the hosted preview.</p>
            </div>

            {!result ? (
              <div className="flex flex-1 items-center justify-center px-8 text-center text-sm text-slate-400">
                Complete the brief and run the builder. Your structured output and published preview URL will appear here.
              </div>
            ) : (
              <>
                <div className="space-y-4 border-b border-white/10 px-5 py-4 sm:px-6">
                  <div className="flex flex-wrap items-center gap-2">
                    {(['output', 'html', 'schema', 'prompt'] as Tab[]).map((nextTab) => {
                      const disabled = nextTab === 'html' ? !htmlBlock : nextTab === 'schema' ? !jsonBlock : false;
                      return (
                        <button
                          key={nextTab}
                          type="button"
                          disabled={disabled}
                          onClick={() => setTab(nextTab)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            tab === nextTab
                              ? 'bg-gradient-to-r from-primary to-violet-500 text-white'
                              : 'border border-white/10 bg-black/20 text-slate-300 hover:border-primary/40 hover:text-white'
                          } disabled:cursor-not-allowed disabled:opacity-40`}
                        >
                          {nextTab === 'output'
                            ? 'Output'
                            : nextTab === 'html'
                              ? 'HTML'
                              : nextTab === 'schema'
                                ? 'JSON-LD'
                                : 'Prompt'}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Model</p>
                      <p className="mt-2 text-white">{result.model}</p>
                      {result.usage ? (
                        <p className="mt-2 text-xs text-slate-400">
                          {result.usage.totalTokens} tokens · prompt {result.usage.promptTokens} · completion {result.usage.completionTokens}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Published preview</p>
                      {publishing ? <p className="mt-2 text-white">Publishing preview…</p> : null}
                      {preview ? (
                        <div className="mt-2 space-y-2">
                          <input
                            readOnly
                            value={preview.url}
                            onFocus={(event) => event.currentTarget.select()}
                            className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-slate-200"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(preview.url)}
                              className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-primary/40 hover:text-white"
                            >
                              Copy URL
                            </button>
                            <a
                              href={preview.path}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full bg-gradient-to-r from-primary to-violet-500 px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
                            >
                              Open preview
                            </a>
                          </div>
                        </div>
                      ) : null}
                      {publishError ? <p className="mt-2 text-xs text-rose-300">{publishError}</p> : null}
                    </div>
                  </div>
                </div>

                {preview ? (
                  <div className="border-b border-white/10 px-5 py-4 sm:px-6">
                    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl ring-1 ring-primary/20">
                      <iframe title="Landing page preview" src={preview.path} className="h-[420px] w-full bg-white" />
                    </div>
                  </div>
                ) : null}

                <div className="flex-1 overflow-auto px-5 py-4 sm:px-6">
                  {tab === 'output' ? (
                    <pre className="whitespace-pre-wrap rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-sm leading-7 text-slate-100">
                      {result.reply}
                    </pre>
                  ) : null}

                  {tab === 'html' && htmlBlock ? (
                    <pre className="overflow-auto rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-xs leading-6 text-emerald-200">
                      {htmlBlock}
                    </pre>
                  ) : null}

                  {tab === 'schema' ? (
                    jsonBlock ? (
                      <pre className="overflow-auto rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-xs leading-6 text-sky-200">
                        {jsonBlock}
                      </pre>
                    ) : (
                      <div className="rounded-3xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-400">
                        No JSON-LD block was found in the model response.
                      </div>
                    )
                  ) : null}

                  {tab === 'prompt' ? (
                    <pre className="whitespace-pre-wrap rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-sm leading-7 text-slate-200">
                      {prompt}
                    </pre>
                  ) : null}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

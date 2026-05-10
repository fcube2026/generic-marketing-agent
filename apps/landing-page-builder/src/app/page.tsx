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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.22),_transparent_35%),linear-gradient(180deg,#020617_0%,#0f172a_45%,#111827_100%)] px-4 py-10 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="space-y-4">
          <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary-light">
            Standalone tool
          </span>
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Landing Page Builder</h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              Generate a complete landing page from a structured brief, then publish a shareable live preview URL without going through the marketing-agent skills UI.
            </p>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_1.35fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow backdrop-blur">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-light">Step 1 · Brief</p>
                  <h2 className="mt-2 text-lg font-bold text-white">Capture the landing-page brief</h2>
                </div>
                <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
                  {completedSteps}/{LANDING_PAGE_WIZARD_STEPS.length} steps complete
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {LANDING_PAGE_WIZARD_STEPS.map((step, index) => {
                  const active = index === stepIndex;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setStepIndex(index)}
                      className={`rounded-2xl border px-3 py-3 text-left transition ${
                        active
                          ? 'border-primary bg-primary/10 text-white'
                          : 'border-white/10 bg-black/10 text-slate-400 hover:border-primary/40 hover:text-white'
                      }`}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">0{index + 1}</p>
                      <p className="mt-1 text-sm font-semibold">{step.title}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-slate-950/40 p-4">
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
                  className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-primary/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStepIndex((prev) => Math.min(prev + 1, LANDING_PAGE_WIZARD_STEPS.length - 1))}
                  disabled={stepIndex === LANDING_PAGE_WIZARD_STEPS.length - 1}
                  className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
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
              className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? 'Building landing page…' : 'Build landing page'}
            </button>
          </section>

          <section className="flex min-h-[720px] flex-col rounded-3xl border border-white/10 bg-white/5 backdrop-blur">
            <div className="border-b border-white/10 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-light">Step 2 · Output</p>
              <h2 className="mt-2 text-lg font-bold text-white">Preview, HTML, schema, and prompt</h2>
            </div>

            {!result ? (
              <div className="flex flex-1 items-center justify-center px-8 text-center text-sm text-slate-400">
                Complete the brief and run the builder. Your structured output and published preview URL will appear here.
              </div>
            ) : (
              <>
                <div className="space-y-4 border-b border-white/10 px-5 py-4">
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
                              ? 'bg-primary text-white'
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
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Model</p>
                      <p className="mt-2 text-white">{result.model}</p>
                      {result.usage ? (
                        <p className="mt-2 text-xs text-slate-400">
                          {result.usage.totalTokens} tokens · prompt {result.usage.promptTokens} · completion {result.usage.completionTokens}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
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
                              className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-primary/40 hover:text-white"
                            >
                              Copy URL
                            </button>
                            <a
                              href={preview.path}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark"
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
                  <div className="border-b border-white/10 px-5 py-4">
                    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl">
                      <iframe title="Landing page preview" src={preview.path} className="h-[420px] w-full bg-white" />
                    </div>
                  </div>
                ) : null}

                <div className="flex-1 overflow-auto px-5 py-4">
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

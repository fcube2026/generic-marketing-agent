'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { marketingSkills, type MarketingSkill } from '@/lib/data';
import { getAdvancedSkillConfig } from '@/lib/skills/registry';
import {
  runSkill,
  critiqueSkillRun,
  extractJsonBlock,
  type SkillRunResult,
  composeSkillSystemPrompt,
} from '@/lib/skills/runner';
import { loadOrgContext, type OrgContextResult } from '@/lib/skills/context';
import type {
  AdvancedSkillConfig,
  SkillCritique,
  SkillInput,
  SkillInputValue,
} from '@/lib/skills/types';
import { describeAiError, generateChatReply } from '@/lib/services/aiService';
import {
  publishLandingPagePreview,
  extractHtmlBlock,
  type PublishLandingPageResult,
} from '@/lib/services/landingPageService';
import { createPlanItem } from '@/lib/services/marketingService';
import { GeneratedImage } from '@/components/ui/GeneratedImage';
import ProgressBar from '@/components/ui/ProgressBar';

type ArtifactTab = 'brief' | 'output' | 'json' | 'visual' | 'critique' | 'context';
type SectionDraft = { content: string; updatedAt: number; source: 'ai' | 'manual' };

const LANDING_PAGE_WIZARD_STEPS = [
  {
    id: 'business-audience',
    title: 'Business & audience',
    description: 'Define who the page is for and what conversion job it needs to do.',
    inputNames: ['businessName', 'industry', 'pageGoal', 'audience', 'offer', 'primaryCta', 'secondaryCta', 'tone'],
  },
  {
    id: 'design-preferences',
    title: 'Design preferences',
    description: 'Capture brand cues before any copy or layout is generated.',
    inputNames: ['designStyle', 'colorPalette', 'referenceUrls'],
  },
  {
    id: 'structure-content',
    title: 'Page structure & content',
    description: 'Select the sections and lock in the proof points, benefits, and guardrails.',
    inputNames: ['sections', 'keyBenefits', 'socialProof', 'mustInclude', 'avoidWords'],
  },
  {
    id: 'technical-requirements',
    title: 'Technical requirements',
    description: 'Set the output format and any CRM / form handoff constraints.',
    inputNames: ['outputFormat', 'formIntegration'],
  },
] as const;

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

function buildSectionPrompt(args: {
  sectionName: string;
  values: Record<string, SkillInputValue>;
  existingDrafts: string;
}): string {
  const { sectionName, values, existingDrafts } = args;
  const sections = Array.isArray(values.sections) ? values.sections.join(', ') : String(values.sections ?? '—');
  const keyBenefits = typeof values.keyBenefits === 'string' && values.keyBenefits.trim() ? values.keyBenefits : '—';
  const socialProof = typeof values.socialProof === 'string' && values.socialProof.trim() ? values.socialProof : '—';
  const mustInclude = typeof values.mustInclude === 'string' && values.mustInclude.trim() ? values.mustInclude : '—';
  const avoidWords = typeof values.avoidWords === 'string' && values.avoidWords.trim() ? values.avoidWords : '—';
  const references = typeof values.referenceUrls === 'string' && values.referenceUrls.trim() ? values.referenceUrls : '—';
  const technical = typeof values.outputFormat === 'string' && values.outputFormat.trim() ? values.outputFormat : 'Responsive HTML';
  const formIntegration = typeof values.formIntegration === 'string' && values.formIntegration.trim() ? values.formIntegration : '—';
  const palette = typeof values.colorPalette === 'string' && values.colorPalette.trim() ? values.colorPalette : '—';

  return `Generate only the **${sectionName}** section for this landing page.

Business / brand: ${values.businessName}
Industry: ${values.industry}
Page goal: ${values.pageGoal}
Audience: ${values.audience}
Offer: ${values.offer}
Primary CTA: ${values.primaryCta}
Secondary CTA: ${values.secondaryCta || '—'}
Tone: ${values.tone}
Design style: ${values.designStyle}
Preferred palette / visual cues: ${palette}
Reference URLs / inspiration: ${references}
Requested section order: ${sections}
Key benefits / features:
${keyBenefits}

Social proof we can cite:
${socialProof}

Must-include phrases / compliance lines:
${mustInclude}

Words / claims to avoid:
${avoidWords}

Technical output / implementation notes: ${technical}
Form integration / CRM handoff: ${formIntegration}

Other approved section drafts (for voice / continuity only):
${existingDrafts || '—'}

Return only markdown for the ${sectionName} section. Structure it as:
1. **Purpose** — one sentence describing the conversion job of this section.
2. **Final copy** — final on-page copy, headings, supporting lines, bullets, and CTA labels if relevant.
3. **Design / implementation notes** — short notes for layout, proof placement, or integration hooks.

Do not write HTML. Do not invent testimonials, names, ratings, prices, or stats.`;
}

function serializeSectionDrafts(
  sections: string[],
  drafts: Record<string, SectionDraft>,
): string {
  return sections
    .map((sectionName, idx) => {
      const draft = drafts[sectionName]?.content?.trim();
      if (!draft) return null;
      return `${idx + 1}. ${sectionName}\n${draft}`;
    })
    .filter(Boolean)
    .join('\n\n');
}

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

function LandingPageLivePreview({
  businessName,
  pageGoal,
  offer,
  primaryCta,
  secondaryCta,
  sections,
  drafts,
}: {
  businessName: string;
  pageGoal: string;
  offer: string;
  primaryCta: string;
  secondaryCta: string;
  sections: string[];
  drafts: Record<string, SectionDraft>;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 text-white shadow-sm">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
          Live wireframe preview
        </div>
        <h3 className="mt-4 text-2xl font-bold leading-tight text-white">
          {pageGoal || 'Your landing page headline will appear here'}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-200">
          {offer || 'Generate section drafts to preview the page structure and copy in context.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900">
            {primaryCta || 'Primary CTA'}
          </span>
          {secondaryCta ? (
            <span className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white">
              {secondaryCta}
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-slate-400">
          {businessName || 'Your brand'} preview
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {sections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/20 px-4 py-6 text-center text-sm text-slate-300">
            Select page sections to start building your preview.
          </div>
        ) : (
          sections.map((sectionName) => (
            <section key={sectionName} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{sectionName}</p>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-100">
                {drafts[sectionName]?.content?.trim() || 'Generate this section to preview its copy here.'}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

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
  const isLandingPage = skillId === 'landing-page';

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
  const [preview, setPreview] = useState<PublishLandingPageResult | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [copiedPreviewUrl, setCopiedPreviewUrl] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);

  const [wizardStep, setWizardStep] = useState(0);
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, SectionDraft>>({});
  const [sectionLoading, setSectionLoading] = useState<Record<string, boolean>>({});
  const [generatingAllSections, setGeneratingAllSections] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [orgContext, setOrgContext] = useState<OrgContextResult | null>(null);
  const [loadingOrgContext, setLoadingOrgContext] = useState(false);

  const selectedSections = useMemo(
    () => (Array.isArray(values.sections) ? (values.sections as string[]) : []),
    [values.sections],
  );
  const jsonBlock = useMemo(() => (result ? extractJsonBlock(result.reply) : null), [result]);
  const wizardInputs = useMemo(() => {
    if (!config) return {} as Record<string, SkillInput>;
    return config.inputs.reduce<Record<string, SkillInput>>((acc, input) => {
      acc[input.name] = input;
      return acc;
    }, {});
  }, [config]);
  const sectionDraftSummary = useMemo(
    () => serializeSectionDrafts(selectedSections, sectionDrafts),
    [selectedSections, sectionDrafts],
  );
  const landingPageValidationError = useMemo(
    () => (config ? validateInputs(config, values) : 'Skill config missing'),
    [config, values],
  );

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (config) setValues(buildInitialValues(config));
    setResult(null);
    setCritique(null);
    setError(null);
    setCritiqueError(null);
    setPlanSaved(null);
    setPreview(null);
    setPublishError(null);
    setCopiedPreviewUrl(false);
    setWizardStep(0);
    setSectionDrafts({});
    setSectionLoading({});
    setGeneratingAllSections(false);
    setSectionError(null);
    setOrgContext(null);
    setLoadingOrgContext(false);
  }, [config, skillId]);

  useEffect(() => {
    if (!isLandingPage) return;
    setSectionDrafts((prev) => {
      const next = Object.fromEntries(
        Object.entries(prev).filter(([sectionName]) => selectedSections.includes(sectionName)),
      );
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
    setSectionLoading((prev) => {
      const next = Object.fromEntries(
        Object.entries(prev).filter(([sectionName]) => selectedSections.includes(sectionName)),
      );
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [isLandingPage, selectedSections]);

  useEffect(() => {
    if (!result || skillId !== 'landing-page') return;
    const html = extractHtmlBlock(result.reply);
    if (!html) {
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
        const published = await publishLandingPagePreview({ html });
        if (!cancelled) setPreview(published);
      } catch (err) {
        if (!cancelled) {
          setPublishError(describeAiError(err, 'Failed to publish landing page preview'));
        }
      } finally {
        if (!cancelled) setPublishing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [result, skillId]);

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

  async function ensureOrgContext(): Promise<OrgContextResult> {
    if (!config) throw new Error('Skill config missing');
    if (orgContext) return orgContext;
    setLoadingOrgContext(true);
    try {
      const loaded = await loadOrgContext(config.tools);
      setOrgContext(loaded);
      return loaded;
    } finally {
      setLoadingOrgContext(false);
    }
  }

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
      const preparedContext = isLandingPage ? await ensureOrgContext() : undefined;
      const runInputs = isLandingPage
        ? { ...values, sectionDrafts: sectionDraftSummary }
        : values;
      const r = await runSkill({
        skillId: skill.id,
        skillName: skill.name,
        config,
        inputs: runInputs,
        precomputedOrgContext: preparedContext,
      });
      if (isLandingPage) setOrgContext(r.orgContext);
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

  async function onGenerateSection(sectionName: string) {
    if (!skill || !config) return;
    const validationError = validateInputs(config, values);
    if (validationError) {
      setSectionError(validationError);
      return;
    }
    setSectionError(null);
    setSectionLoading((prev) => ({ ...prev, [sectionName]: true }));
    try {
      const preparedContext = await ensureOrgContext();
      const system = composeSkillSystemPrompt({
        skillName: skill.name,
        config,
        orgContextText: preparedContext.text,
      });
      const otherDrafts = serializeSectionDrafts(
        selectedSections.filter((name) => name !== sectionName),
        sectionDrafts,
      );
      const reply = await generateChatReply({
        system,
        messages: [
          {
            role: 'user',
            content: buildSectionPrompt({
              sectionName,
              values,
              existingDrafts: otherDrafts,
            }),
          },
        ],
      });
      setSectionDrafts((prev) => ({
        ...prev,
        [sectionName]: {
          content: reply.reply.trim(),
          updatedAt: Date.now(),
          source: 'ai',
        },
      }));
    } catch (err) {
      setSectionError(describeAiError(err, `Failed to generate ${sectionName}`));
    } finally {
      setSectionLoading((prev) => ({ ...prev, [sectionName]: false }));
    }
  }

  async function onGenerateAllSections() {
    if (selectedSections.length === 0) {
      setSectionError('Choose at least one section before generating drafts');
      return;
    }
    setGeneratingAllSections(true);
    setSectionError(null);
    try {
      for (const sectionName of selectedSections) {
        await onGenerateSection(sectionName);
      }
    } finally {
      setGeneratingAllSections(false);
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

  const currentWizardStep = LANDING_PAGE_WIZARD_STEPS[wizardStep];
  const completedWizardSteps = LANDING_PAGE_WIZARD_STEPS.filter((step) =>
    step.inputNames.every((name) => {
      const value = values[name];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'number') return Number.isFinite(value) && value !== 0;
      return String(value ?? '').trim().length > 0;
    }),
  ).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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
        <section className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 space-y-4 self-start">
          {isLandingPage ? (
            <>
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-primary font-bold">Step 1 · Intake wizard</p>
                  <h2 className="text-sm font-semibold text-gray-900">Capture the landing-page brief layer by layer</h2>
                </div>
                <ProgressBar
                  value={completedWizardSteps}
                  max={LANDING_PAGE_WIZARD_STEPS.length}
                  label={`${completedWizardSteps}/${LANDING_PAGE_WIZARD_STEPS.length} steps complete`}
                  showPercent={false}
                />
                <div className="grid grid-cols-2 gap-2">
                  {LANDING_PAGE_WIZARD_STEPS.map((step, idx) => {
                    const active = idx === wizardStep;
                    const complete = idx < completedWizardSteps;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => setWizardStep(idx)}
                        className={`rounded-xl border px-3 py-2 text-left transition ${
                          active
                            ? 'border-primary bg-primary/5 text-primary'
                            : complete
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-gray-200 text-gray-500 hover:border-primary/40 hover:text-primary'
                        }`}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wide">{`0${idx + 1}`}</p>
                        <p className="mt-1 text-xs font-semibold">{step.title}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-900">{currentWizardStep.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{currentWizardStep.description}</p>
                </div>
                <div className="space-y-4">
                  {currentWizardStep.inputNames.map((inputName) => {
                    const input = wizardInputs[inputName];
                    if (!input) return null;
                    return (
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
                    );
                  })}
                </div>
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setWizardStep((prev) => Math.max(prev - 1, 0))}
                    disabled={wizardStep === 0}
                    className="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStep((prev) => Math.min(prev + 1, LANDING_PAGE_WIZARD_STEPS.length - 1))}
                    disabled={wizardStep === LANDING_PAGE_WIZARD_STEPS.length - 1}
                    className="text-xs px-3 py-2 rounded-lg bg-primary text-white font-semibold disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-primary font-bold">Step 2 · Section studio</p>
                    <h3 className="text-sm font-semibold text-gray-900">Generate and refine each section independently</h3>
                  </div>
                  <button
                    type="button"
                    onClick={onGenerateAllSections}
                    disabled={generatingAllSections || !!landingPageValidationError || selectedSections.length === 0}
                    className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white font-semibold disabled:opacity-50"
                  >
                    {generatingAllSections ? 'Generating…' : 'Generate all'}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Each selected section gets its own draft and can be regenerated without touching the rest of the page.
                </p>
                {loadingOrgContext && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                    Loading brand context and KPIs…
                  </div>
                )}
                {sectionError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {sectionError}
                  </div>
                )}
                <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
                  {selectedSections.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
                      Pick at least one section in the wizard to unlock the section studio.
                    </div>
                  ) : (
                    selectedSections.map((sectionName) => {
                      const loading = !!sectionLoading[sectionName];
                      const draft = sectionDrafts[sectionName]?.content ?? '';
                      return (
                        <div key={sectionName} className="rounded-xl border border-gray-200 p-3 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold text-gray-900">{sectionName}</p>
                              <p className="text-[11px] text-gray-400">
                                {sectionDrafts[sectionName]
                                  ? `Last updated ${new Date(sectionDrafts[sectionName].updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                  : 'No draft yet'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onGenerateSection(sectionName)}
                              disabled={loading || !!landingPageValidationError}
                              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:border-primary hover:text-primary disabled:opacity-50"
                            >
                              {loading ? 'Generating…' : draft ? 'Regenerate' : 'Generate'}
                            </button>
                          </div>
                          <textarea
                            value={draft}
                            onChange={(e) =>
                              setSectionDrafts((prev) => ({
                                ...prev,
                                [sectionName]: {
                                  content: e.target.value,
                                  updatedAt: Date.now(),
                                  source: 'manual',
                                },
                              }))
                            }
                            rows={10}
                            placeholder={`Generated ${sectionName} copy will appear here.`}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y"
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-primary font-bold">Step 3 · Live preview</p>
                    <h3 className="text-sm font-semibold text-gray-900">Preview the story flow before building the final page</h3>
                  </div>
                  <span className="text-[11px] text-gray-400">{selectedSections.length} section(s)</span>
                </div>
                <LandingPageLivePreview
                  businessName={String(values.businessName ?? '')}
                  pageGoal={String(values.pageGoal ?? '')}
                  offer={String(values.offer ?? '')}
                  primaryCta={String(values.primaryCta ?? '')}
                  secondaryCta={String(values.secondaryCta ?? '')}
                  sections={selectedSections}
                  drafts={sectionDrafts}
                />
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
                {running ? 'Building landing page…' : '▶ Build full page'}
              </button>

              <div className="text-[11px] text-gray-400 leading-relaxed">
                Final build reuses your section drafts, live org context, and technical requirements to produce the previewable HTML artifact.
              </div>
            </>
          ) : (
            <>
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
                is grounded in real your brand data.
              </div>
            </>
          )}
        </section>

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
                    {skillId === 'landing-page' && (publishing || preview || publishError) && (
                      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-white to-purple-50 p-4">
                        {publishing && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span>Publishing landing page preview…</span>
                          </div>
                        )}
                        {preview && !publishing && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs font-bold text-primary uppercase tracking-wide">
                                🌐 Live preview URL
                              </p>
                              <span className="text-[10px] text-gray-400">
                                Preview lives in memory — re-run to refresh
                              </span>
                            </div>
                            <div className="flex items-stretch gap-2">
                              <input
                                type="text"
                                readOnly
                                value={preview.url}
                                onFocus={(e) => e.currentTarget.select()}
                                className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-800"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  copyToClipboard(preview.url);
                                  setCopiedPreviewUrl(true);
                                  if (copiedTimerRef.current !== null) {
                                    window.clearTimeout(copiedTimerRef.current);
                                  }
                                  copiedTimerRef.current = window.setTimeout(() => {
                                    setCopiedPreviewUrl(false);
                                    copiedTimerRef.current = null;
                                  }, 2000);
                                }}
                                className="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:border-primary hover:text-primary font-semibold"
                              >
                                {copiedPreviewUrl ? '✓ Copied' : 'Copy'}
                              </button>
                              <a
                                href={preview.path}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs px-3 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition"
                              >
                                Open ↗
                              </a>
                            </div>
                            {preview.title && (
                              <p className="text-[11px] text-gray-500 truncate">
                                <span className="font-semibold">Title:</span> {preview.title}
                              </p>
                            )}
                          </div>
                        )}
                        {publishError && !publishing && (
                          <p className="text-xs text-red-600">⚠️ {publishError}</p>
                        )}
                      </div>
                    )}
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
                      provider={result.visualProvider}
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

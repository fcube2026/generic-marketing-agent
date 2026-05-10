/**
 * Client-side runner that ties together:
 *   - prompt templating (lib/skills/template)
 *   - org-context injection (lib/skills/context)
 *   - the existing /api/ai/chat + /api/ai/image + /api/ai/critique routes
 *
 * The UI calls `runSkill()` and gets back a structured `SkillRunResult`
 * (artifact text + optional image + optional critique) that it can render
 * in the multi-tab artifact view.
 */

import api from '../api';
import { generateChatReply } from '../services/aiService';
import type {
  AdvancedSkillConfig,
  SkillCritique,
  SkillInputValue,
} from './types';
import { renderPrompt } from './template';
import { loadOrgContext, type OrgContextResult } from './context';

export interface RunSkillInput {
  skillId: string;
  skillName: string;
  config: AdvancedSkillConfig;
  inputs: Record<string, SkillInputValue>;
  /** Override automatic org-context loading (e.g. for tests). */
  precomputedOrgContext?: OrgContextResult;
}

export interface SkillRunResult {
  prompt: string;
  systemPrompt: string;
  reply: string;
  model: string;
  orgContext: OrgContextResult | null;
  /** If the skill declares a `visual`, this is the prompt to feed into <GeneratedImage>. */
  visualPrompt?: string;
  visualSize?: { width: number; height: number };
  /** Optional image provider override for the visual (e.g. 'google' = nano-banana). */
  visualProvider?: 'openai' | 'google';
}

function joinGuardrails(guardrails: string[] | undefined): string {
  if (!guardrails || guardrails.length === 0) return '';
  return `\n\nGuardrails (must obey):\n${guardrails.map((g) => `- ${g}`).join('\n')}`;
}

export function composeSkillSystemPrompt(args: {
  skillName: string;
  config: AdvancedSkillConfig;
  orgContextText?: string;
}): string {
  const { skillName, config, orgContextText } = args;
  return (
    `Skill: ${skillName}\n\n${config.systemPrompt}` +
    joinGuardrails(config.guardrails) +
    (orgContextText ? `\n\n${orgContextText}` : '')
  );
}

export async function runSkill(input: RunSkillInput): Promise<SkillRunResult> {
  const { skillName, config, inputs } = input;

  // 1. Load live org context (best-effort).
  const orgContext = input.precomputedOrgContext
    ? input.precomputedOrgContext
    : await loadOrgContext(config.tools);

  // 2. Render prompt + system.
  const userPrompt = renderPrompt(config.promptTemplate, inputs);
  const systemPrompt = composeSkillSystemPrompt({
    skillName,
    config,
    orgContextText: orgContext.text,
  });

  // 3. Call /api/ai/chat
  const chat = await generateChatReply({
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  // 4. Optional matching visual — we just compute the prompt; the
  //    <GeneratedImage> component handles the actual image API call so it
  //    can independently retry on transient failures.
  let visualPrompt: string | undefined;
  let visualSize: { width: number; height: number } | undefined;
  let visualProvider: 'openai' | 'google' | undefined;
  if (config.visual) {
    visualPrompt = `${config.visual.promptHint}. Context: ${userPrompt.slice(0, 400)}`;
    visualSize = { width: config.visual.width, height: config.visual.height };
    visualProvider = config.visual.provider;
  }

  return {
    prompt: userPrompt,
    systemPrompt,
    reply: chat.reply,
    model: chat.model,
    orgContext,
    visualPrompt,
    visualSize,
    visualProvider,
  };
}

// ─── Critique ────────────────────────────────────────────────────────────────

export async function critiqueSkillRun(args: {
  skillName: string;
  output: string;
  rubric: AdvancedSkillConfig['successCriteria'];
}): Promise<SkillCritique | null> {
  if (!args.rubric || args.rubric.length === 0) return null;
  const { data } = await api.post<SkillCritique>(
    '/api/ai/critique',
    { skillName: args.skillName, output: args.output, rubric: args.rubric },
    { baseURL: '/' },
  );
  return data;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FENCE_RE = /```(?:json)?\s*([\s\S]*?)```/i;

/** Extract the first ```json fenced block from an LLM reply. */
export function extractJsonBlock(reply: string): string | null {
  const m = reply.match(FENCE_RE);
  if (!m) return null;
  const candidate = m[1].trim();
  try {
    JSON.parse(candidate);
    return candidate;
  } catch {
    return null;
  }
}

/**
 * Tiny Handlebars-lite template engine for skill prompts. We deliberately
 * avoid pulling in a full template lib — we only need `{{name}}` substitution
 * with array-join + a fallback, plus `{{#if name}}…{{/if}}` blocks.
 *
 * Unknown variables render as "—" so the LLM gets a clean, explicit hint
 * instead of a leftover `{{var}}` token.
 */

import type { SkillInputValue } from './types';

const VAR_RE = /{{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*}}/g;
const IF_RE = /{{#if\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*}}([\s\S]*?){{\/if}}/g;

function formatValue(v: SkillInputValue | undefined): string {
  if (v === undefined || v === null) return '—';
  if (Array.isArray(v)) return v.length === 0 ? '—' : v.join(', ');
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '—';
  const s = String(v).trim();
  return s.length === 0 ? '—' : s;
}

function isTruthy(v: SkillInputValue | undefined): boolean {
  if (v === undefined || v === null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0 && Number.isFinite(v);
  return String(v).trim().length > 0;
}

export function renderPrompt(
  template: string,
  values: Record<string, SkillInputValue>,
): string {
  // Resolve `{{#if x}}…{{/if}}` first so nested vars inside still get expanded.
  const withIf = template.replace(IF_RE, (_m, name: string, body: string) =>
    isTruthy(values[name]) ? body : '',
  );
  return withIf.replace(VAR_RE, (_m, name: string) => formatValue(values[name]));
}

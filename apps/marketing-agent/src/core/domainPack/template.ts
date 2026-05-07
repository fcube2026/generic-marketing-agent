/**
 * Tiny `{{var}}` and `{{#if var}}…{{/if}}` template renderer used by the
 * skill runner to fill prompts with tenant + intake data.
 *
 * We deliberately don't pull in Handlebars/eta — packs ship in this repo,
 * the input space is small and well-defined, and avoiding the dep keeps
 * the runtime bundle tiny on edge platforms.
 *
 * Supported syntax:
 *   {{name}}              — interpolation; missing keys render as ''.
 *   {{user.email}}        — dotted paths.
 *   {{#if name}}…{{/if}}  — conditional block; truthy when value is non-empty.
 *
 * Anything more elaborate (loops, helpers) belongs in a real template engine
 * — promote at that point.
 */

export type TemplateContext = Record<string, unknown>;

const VAR_RE = /\{\{\s*([\w.[\]]+)\s*\}\}/g;
const IF_RE = /\{\{#if\s+([\w.[\]]+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g;

export function renderTemplate(template: string, context: TemplateContext): string {
  // Conditional blocks first so their inner `{{var}}` calls still get filled.
  const withIfs = template.replace(IF_RE, (_, key: string, body: string) =>
    truthy(resolve(context, key)) ? body : '',
  );
  return withIfs.replace(VAR_RE, (_, key: string) => {
    const v = resolve(context, key);
    return v == null ? '' : String(v);
  });
}

function truthy(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v as object).length > 0;
  return Boolean(v);
}

function resolve(ctx: TemplateContext, path: string): unknown {
  const parts = path.split('.').flatMap((p) =>
    p.split(/\[(\d+)\]/).filter((s) => s.length > 0),
  );
  let cur: unknown = ctx;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

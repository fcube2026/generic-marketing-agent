/**
 * In-memory store for **published landing-page previews**.
 *
 * The Landing Page Builder skill emits a full HTML document. We persist it
 * here keyed by an opaque id so the UI can show a real, shareable URL like
 * `/landing-preview/<id>` that renders the page exactly as it would appear
 * in production. The store is per-process and intentionally bounded — this
 * is a preview surface, not durable hosting.
 *
 * Trade-offs:
 * - Lives only for the lifetime of the Next.js server process. A redeploy
 *   or restart drops every preview. Acceptable for a "preview & share with
 *   the team" workflow; callers should re-publish if they need a fresh URL.
 * - Capped at MAX_ENTRIES with a simple LRU-by-insertion eviction so a long
 *   running dev session can't OOM the process.
 */
import { randomUUID } from 'node:crypto';

export interface LandingPagePreview {
  id: string;
  html: string;
  title: string | null;
  createdAt: number;
}

const MAX_ENTRIES = 200;
const MAX_HTML_BYTES = 512 * 1024; // 512 KB — generous for a single landing page

const store = new Map<string, LandingPagePreview>();

export class LandingPageStoreError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'LandingPageStoreError';
    this.status = status;
  }
}

/**
 * Pull a `<title>` out of the document so the preview list / share card
 * can show something meaningful. Returns null if no title can be derived.
 */
function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return null;
  const t = m[1].replace(/\s+/g, ' ').trim();
  return t.length > 0 ? t.slice(0, 200) : null;
}

/**
 * Validate that the supplied string is a plausible self-contained HTML
 * document and not (e.g.) a markdown reply we forgot to strip a fence
 * from. We deliberately do NOT sanitize — landing pages legitimately
 * include rich markup, inline styles, and CDN scripts (Tailwind). The
 * preview route serves the HTML with a hardened Content-Security-Policy
 * and a sandboxed iframe context to mitigate XSS risk to the host app.
 */
function validateHtml(html: string): void {
  if (typeof html !== 'string') {
    throw new LandingPageStoreError('html must be a string', 400);
  }
  const trimmed = html.trim();
  if (trimmed.length === 0) {
    throw new LandingPageStoreError('html is empty', 400);
  }
  if (Buffer.byteLength(trimmed, 'utf8') > MAX_HTML_BYTES) {
    throw new LandingPageStoreError(
      `html exceeds ${MAX_HTML_BYTES} bytes`,
      413,
    );
  }
  // Cheap structural check — must look like an HTML document, not a
  // markdown reply or arbitrary text.
  if (!/<html[\s>]/i.test(trimmed) && !/<!doctype\s+html/i.test(trimmed)) {
    throw new LandingPageStoreError(
      'html must be a complete HTML document (missing <!doctype html> or <html>)',
      400,
    );
  }
}

export function publishLandingPage(html: string): LandingPagePreview {
  validateHtml(html);
  const id = randomUUID();
  const entry: LandingPagePreview = {
    id,
    html,
    title: extractTitle(html),
    createdAt: Date.now(),
  };
  store.set(id, entry);
  // Simple FIFO eviction so the process stays bounded.
  while (store.size > MAX_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (oldestKey === undefined) break;
    store.delete(oldestKey);
  }
  return entry;
}

export function getLandingPage(id: string): LandingPagePreview | null {
  if (!id || typeof id !== 'string') return null;
  return store.get(id) ?? null;
}

/** Test-only — reset state between unit tests. */
export function __resetLandingPageStoreForTests(): void {
  store.clear();
}

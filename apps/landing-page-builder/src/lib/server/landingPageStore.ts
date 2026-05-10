import { randomUUID } from 'node:crypto';

export interface LandingPagePreview {
  id: string;
  html: string;
  title: string | null;
  createdAt: number;
}

const MAX_ENTRIES = 200;
const MAX_HTML_BYTES = 512 * 1024;

const store = new Map<string, LandingPagePreview>();

export class LandingPageStoreError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'LandingPageStoreError';
    this.status = status;
  }
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  const title = match[1].replace(/\s+/g, ' ').trim();
  return title.length > 0 ? title.slice(0, 200) : null;
}

function validateHtml(html: string): void {
  if (typeof html !== 'string') {
    throw new LandingPageStoreError('html must be a string', 400);
  }

  const trimmed = html.trim();
  if (trimmed.length === 0) {
    throw new LandingPageStoreError('html is empty', 400);
  }

  if (Buffer.byteLength(trimmed, 'utf8') > MAX_HTML_BYTES) {
    throw new LandingPageStoreError(`html exceeds ${MAX_HTML_BYTES} bytes`, 413);
  }

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

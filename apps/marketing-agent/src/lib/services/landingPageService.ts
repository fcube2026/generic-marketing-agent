import api from '../api';

/**
 * Client-side wrapper around `POST /api/landing-page/preview`. Takes the
 * full HTML emitted by the Landing Page Builder skill and returns a real,
 * shareable URL that renders it standalone (no app chrome).
 *
 * Auth piggy-backs on the shared axios `api` instance — the JWT under
 * `marketing_token` is attached automatically.
 */

export interface PublishLandingPageInput {
  html: string;
}

export interface PublishLandingPageResult {
  id: string;
  /** Server-relative path, e.g. `/landing-preview/abc-123`. */
  path: string;
  /** Absolute URL, suitable for copy/paste / sharing. */
  url: string;
  title: string | null;
  createdAt: number;
}

export async function publishLandingPagePreview(
  input: PublishLandingPageInput,
): Promise<PublishLandingPageResult> {
  const { data } = await api.post<PublishLandingPageResult>(
    '/api/landing-page/preview',
    input,
    {
      // Bypass the shared `/api/backend` baseURL so we hit the local Next.js route.
      baseURL: '/',
    },
  );
  return data;
}

/**
 * Pull the first ```html fenced block out of an LLM reply. Returns null if
 * no block is found. Used by the Landing Page Builder UI to extract the
 * full HTML document before publishing it as a hosted preview.
 */
const HTML_FENCE_RE = /```html\s*([\s\S]*?)```/i;

export function extractHtmlBlock(reply: string): string | null {
  const m = reply.match(HTML_FENCE_RE);
  if (!m) return null;
  const candidate = m[1].trim();
  return candidate.length > 0 ? candidate : null;
}

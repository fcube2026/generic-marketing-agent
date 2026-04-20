import OpenAI from 'openai';

let cached: OpenAI | null = null;

/**
 * Lazily-instantiated OpenAI SDK client. Reads `OPENAI_API_KEY` from
 * server-side environment only — never exposed to the browser.
 *
 * Throws a clear error at request time (rather than at module load) so the
 * Next.js build does not fail when the key is unset.
 */
export function getOpenAIClient(): OpenAI {
  if (cached) return cached;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not set. Configure it as a server-side environment variable.',
    );
  }

  cached = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
  return cached;
}

export const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini';
export const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';

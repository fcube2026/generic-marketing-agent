import { GoogleGenerativeAI } from '@google/generative-ai';

let cached: GoogleGenerativeAI | null = null;

/**
 * Lazily-instantiated Google AI Studio (Gemini) SDK client. Reads
 * `GOOGLE_AI_API_KEY` from server-side environment only — never exposed to
 * the browser. Get a key at https://aistudio.google.com/apikey.
 *
 * Throws a clear error at request time (rather than at module load) so the
 * Next.js build does not fail when the key is unset.
 */
export function getGoogleAIClient(): GoogleGenerativeAI {
  if (cached) return cached;

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GOOGLE_AI_API_KEY is not set. Configure it as a server-side environment variable. Get a key at https://aistudio.google.com/apikey.',
    );
  }

  cached = new GoogleGenerativeAI(apiKey);
  return cached;
}

export const GOOGLE_TEXT_MODEL = process.env.GOOGLE_AI_TEXT_MODEL || 'gemini-1.5-flash';
export const GOOGLE_IMAGE_MODEL = process.env.GOOGLE_AI_IMAGE_MODEL || 'imagen-3.0-generate-002';

/**
 * Imagen aspect ratios supported by Google's Generative Language API.
 * @see https://ai.google.dev/gemini-api/docs/imagen
 */
export type GoogleImageAspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

const SUPPORTED_RATIOS: { ratio: GoogleImageAspectRatio; value: number }[] = [
  { ratio: '1:1', value: 1 },
  { ratio: '4:3', value: 4 / 3 },
  { ratio: '3:4', value: 3 / 4 },
  { ratio: '16:9', value: 16 / 9 },
  { ratio: '9:16', value: 9 / 16 },
];

/**
 * Snap an arbitrary width × height request to the closest Imagen-supported
 * aspect ratio.
 */
export function pickClosestImagenRatio(width: number, height: number): GoogleImageAspectRatio {
  const safeW = Math.max(1, width);
  const safeH = Math.max(1, height);
  const target = safeW / safeH;
  let best = SUPPORTED_RATIOS[0];
  let bestDelta = Math.abs(Math.log(target / best.value));
  for (let i = 1; i < SUPPORTED_RATIOS.length; i += 1) {
    const cand = SUPPORTED_RATIOS[i];
    const delta = Math.abs(Math.log(target / cand.value));
    if (delta < bestDelta) {
      best = cand;
      bestDelta = delta;
    }
  }
  return best.ratio;
}

const GOOGLE_IMAGE_TIMEOUT_MS = 60_000;

export class GoogleImageError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'GoogleImageError';
    this.status = status;
  }
}

/**
 * Generate an image with Google's Imagen model via the Generative Language
 * REST API. The `@google/generative-ai` SDK does not currently expose
 * Imagen's `predict` endpoint, so we call it directly with the same API key.
 *
 * Returns a base64 data URL so the response shape matches the OpenAI path.
 */
export async function googleImagenGenerate(params: {
  prompt: string;
  width: number;
  height: number;
  model?: string;
  signal?: AbortSignal;
}): Promise<{ dataUrl: string; aspectRatio: GoogleImageAspectRatio; model: string }> {
  const { prompt, width, height, signal } = params;
  const model = params.model || GOOGLE_IMAGE_MODEL;

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new GoogleImageError('GOOGLE_AI_API_KEY is not set', 401);
  }

  const baseUrl = (process.env.GOOGLE_AI_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
  const url = `${baseUrl}/v1beta/models/${encodeURIComponent(model)}:predict`;

  const aspectRatio = pickClosestImagenRatio(width, height);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), GOOGLE_IMAGE_TIMEOUT_MS);
  const onAbort = () => ac.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio,
        },
      }),
      signal: ac.signal,
    });

    if (!res.ok) {
      const detail = await safeReadText(res);
      throw new GoogleImageError(
        `Google Imagen returned ${res.status}: ${detail}`,
        res.status,
      );
    }

    const data = (await res.json()) as {
      predictions?: Array<{
        bytesBase64Encoded?: string;
        mimeType?: string;
      }>;
    };

    const prediction = data.predictions?.[0];
    const b64 = prediction?.bytesBase64Encoded;
    if (!b64) {
      throw new GoogleImageError('Google Imagen returned no image data', 502);
    }
    const mime = prediction?.mimeType || 'image/png';

    return {
      dataUrl: `data:${mime};base64,${b64}`,
      aspectRatio,
      model,
    };
  } catch (err) {
    if (err instanceof GoogleImageError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new GoogleImageError('Google Imagen request timed out', 504);
    }
    throw new GoogleImageError(
      err instanceof Error ? err.message : 'Google Imagen request failed',
      502,
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

async function safeReadText(res: Response): Promise<string> {
  try {
    const t = await res.text();
    return t.slice(0, 500);
  } catch {
    return '<unreadable body>';
  }
}

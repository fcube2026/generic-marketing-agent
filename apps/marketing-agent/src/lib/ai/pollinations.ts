/**
 * Free, no-API-key fallback provider backed by https://pollinations.ai.
 *
 * Used by the `/api/ai/chat` and `/api/ai/image` route handlers when
 * `OPENAI_API_KEY` is not configured, so the marketing-agent UI keeps
 * working in local/dev/preview environments without a paid key.
 *
 * Pollinations is community-run and best-effort — when an OpenAI key IS
 * configured we always prefer that path.
 *
 * Runtime: this module uses Node.js `Buffer` for base64 encoding and is
 * therefore Node-only. Both consumers (`/api/ai/chat` and `/api/ai/image`)
 * already pin `export const runtime = 'nodejs'`.
 */

const TEXT_ENDPOINT = 'https://text.pollinations.ai';
const IMAGE_ENDPOINT = 'https://image.pollinations.ai/prompt';

export const POLLINATIONS_TEXT_MODEL = 'pollinations:openai';
export const POLLINATIONS_IMAGE_MODEL = 'pollinations:flux';

export interface PollinationsChatTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Generate a chat reply using the free Pollinations text endpoint.
 *
 * Pollinations exposes an OpenAI-compatible POST API at https://text.pollinations.ai/openai
 * that accepts a `messages` array. We use that so the system prompt and
 * conversation history are honoured the same way as with OpenAI.
 */
const POLLINATIONS_CHAT_TIMEOUT_MS = 25_000;

export async function pollinationsChat(params: {
  system: string;
  messages: PollinationsChatTurn[];
  signal?: AbortSignal;
}): Promise<string> {
  const { system, messages, signal } = params;

  const body = JSON.stringify({
    model: 'openai',
    messages: [{ role: 'system', content: system }, ...messages],
  });

  // Try once, retry once on transient network/5xx failures. The community
  // endpoint is best-effort and occasionally returns 502/504 cold starts.
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), POLLINATIONS_CHAT_TIMEOUT_MS);
    const onAbort = () => ac.abort();
    signal?.addEventListener('abort', onAbort);
    try {
      const res = await fetch(`${TEXT_ENDPOINT}/openai`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        signal: ac.signal,
      });

      if (!res.ok) {
        const detail = await safeReadText(res);
        const err = new PollinationsError(
          `Pollinations text endpoint returned ${res.status}: ${detail}`,
          res.status,
        );
        // Only retry on 5xx; 4xx will repeat.
        if (res.status >= 500 && attempt === 0) {
          lastErr = err;
          continue;
        }
        throw err;
      }

      // OpenAI-compatible response shape.
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const reply = data.choices?.[0]?.message?.content?.trim() ?? '';
      if (!reply) {
        throw new PollinationsError('Pollinations returned an empty reply', 502);
      }
      return reply;
    } catch (err) {
      lastErr = err;
      // Retry once on AbortError (timeout) or network error.
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const isNetwork = err instanceof TypeError; // fetch network failures
      if ((isAbort || isNetwork) && attempt === 0) continue;
      if (err instanceof PollinationsError) throw err;
      throw new PollinationsError(
        err instanceof Error ? err.message : 'Pollinations chat failed',
        502,
      );
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }
  // Unreachable in practice — the loop either returns or throws.
  throw lastErr instanceof PollinationsError
    ? lastErr
    : new PollinationsError('Pollinations chat failed after retry', 502);
}

/**
 * Generate an image using the free Pollinations image endpoint.
 * Returns a base64 data URL so the response shape matches the OpenAI path.
 */
export async function pollinationsImage(params: {
  prompt: string;
  width: number;
  height: number;
  signal?: AbortSignal;
}): Promise<{ dataUrl: string }> {
  const { prompt, width, height, signal } = params;

  const url = new URL(`${IMAGE_ENDPOINT}/${encodeURIComponent(prompt)}`);
  url.searchParams.set('width', String(width));
  url.searchParams.set('height', String(height));
  url.searchParams.set('nologo', 'true');
  url.searchParams.set('model', 'flux');

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) {
    const detail = await safeReadText(res);
    throw new PollinationsError(
      `Pollinations image endpoint returned ${res.status}: ${detail}`,
      res.status,
    );
  }

  const contentType = res.headers.get('content-type') || 'image/png';
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) {
    throw new PollinationsError('Pollinations returned an empty image', 502);
  }
  return { dataUrl: `data:${contentType};base64,${buf.toString('base64')}` };
}

export class PollinationsError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'PollinationsError';
    this.status = status;
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

import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient, IMAGE_MODEL } from '@/lib/ai/openai-client';
import {
  GoogleImageError,
  googleImagenGenerate,
} from '@/lib/ai/google-client';
import { requireMarketingAuth } from '@/lib/ai/auth';
import { checkRateLimit, getClientKey, rateLimitResponse } from '@/lib/ai/rate-limit';
import { pickClosestSize } from '@/lib/ai/image-sizes';
import { getErrorStatus } from '@/lib/ai/error-utils';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_PROMPT_CHARS = 4000;
const MIN_PROMPT_CHARS = 3;

type ImageProvider = 'openai' | 'google';

interface ImageRequestBody {
  prompt?: unknown;
  width?: unknown;
  height?: unknown;
  format?: unknown;
  provider?: unknown;
}

function badRequest(message: string, code: string) {
  return NextResponse.json({ error: message, code }, { status: 400 });
}

function asPositiveInt(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function resolveProvider(value: unknown): ImageProvider {
  if (value === 'openai' || value === 'google') return value;
  const env = process.env.AI_IMAGE_PROVIDER?.toLowerCase();
  if (env === 'google') return 'google';
  return 'openai';
}

interface SuccessPayload {
  dataUrl?: string;
  url?: string;
  model: string;
  size: string;
  requestedWidth: number;
  requestedHeight: number;
}

/** Outcome of trying a single provider. */
type ProviderOutcome =
  | { kind: 'success'; response: NextResponse }
  | { kind: 'fatal'; response: NextResponse } // e.g. prompt rejected — don't try the other provider
  | { kind: 'retry'; status: number; message: string }; // try next provider

export async function POST(req: NextRequest) {
  // 1. Auth
  const auth = await requireMarketingAuth(req);
  if (!auth.ok) return auth.response;

  // 2. Rate limit (image gen is more expensive than chat — tighter cap).
  const rl = checkRateLimit(`ai-image:${getClientKey(req)}`, { max: 10, windowMs: 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl);

  // 3. Parse + validate body
  let body: ImageRequestBody;
  try {
    body = (await req.json()) as ImageRequestBody;
  } catch {
    return badRequest('Body must be valid JSON', 'invalid_json');
  }

  if (typeof body.prompt !== 'string') {
    return badRequest('`prompt` must be a string', 'invalid_prompt');
  }
  const prompt = body.prompt.trim();
  if (prompt.length < MIN_PROMPT_CHARS) {
    return badRequest(`\`prompt\` must be at least ${MIN_PROMPT_CHARS} characters`, 'prompt_too_short');
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return badRequest(`\`prompt\` exceeds ${MAX_PROMPT_CHARS} characters`, 'prompt_too_long');
  }
  if (
    body.provider !== undefined &&
    body.provider !== 'openai' &&
    body.provider !== 'google'
  ) {
    return badRequest('`provider` must be "openai" or "google"', 'invalid_provider');
  }

  const width = asPositiveInt(body.width, 1024);
  const height = asPositiveInt(body.height, 1024);
  const size = pickClosestSize(width, height);
  const preferred = resolveProvider(body.provider);

  // Try preferred provider first, then the other. If a provider is missing
  // its API key it's still attempted (the helper returns a `retry` outcome
  // immediately) so we cleanly fall through to the alternative. Google's
  // nano-banana (`gemini-2.5-flash-image`) is the recommended default for
  // landing-page hero visuals — there is intentionally no key-less fallback
  // so callers get a clear error instead of a low-quality stand-in.
  const order: ImageProvider[] = [preferred, preferred === 'openai' ? 'google' : 'openai'];

  let lastRetry: { provider: ImageProvider; status: number; message: string } | null = null;
  for (const provider of order) {
    const outcome =
      provider === 'openai'
        ? await tryOpenAI({ prompt, width, height, size })
        : await tryGoogle({ prompt, width, height, size });

    if (outcome.kind === 'success' || outcome.kind === 'fatal') {
      return outcome.response;
    }
    // eslint-disable-next-line no-console
    console.warn(
      `[ai/image] provider=${provider} failed (status=${outcome.status}); ${order.indexOf(provider) + 1 < order.length ? 'trying next provider' : 'no more providers'}`,
    );
    lastRetry = { provider, status: outcome.status, message: outcome.message };
  }

  // Both providers exhausted — surface the most informative error.
  return providerErrorResponse(lastRetry);
}

async function tryOpenAI(args: {
  prompt: string;
  width: number;
  height: number;
  size: string;
}): Promise<ProviderOutcome> {
  const { prompt, width, height, size } = args;

  // No key → cleanly hand off to the next provider.
  let client: ReturnType<typeof getOpenAIClient>;
  try {
    client = getOpenAIClient();
  } catch (err) {
    return {
      kind: 'retry',
      status: 401,
      message: err instanceof Error ? err.message : 'OpenAI key missing',
    };
  }

  try {
    const result = await client.images.generate({
      model: IMAGE_MODEL,
      prompt,
      size: size as '1024x1024' | '1024x1792' | '1792x1024',
      n: 1,
    });

    const item = result.data?.[0];
    const b64 = item?.b64_json;
    const url = item?.url;

    if (!b64 && !url) {
      return {
        kind: 'retry',
        status: 502,
        message: 'OpenAI returned an empty image',
      };
    }

    // eslint-disable-next-line no-console
    console.log(`[ai/image] model=${IMAGE_MODEL} size=${size} requested=${width}x${height}`);

    const payload: SuccessPayload = {
      dataUrl: b64 ? `data:image/png;base64,${b64}` : undefined,
      url,
      model: IMAGE_MODEL,
      size,
      requestedWidth: width,
      requestedHeight: height,
    };
    return { kind: 'success', response: NextResponse.json(payload) };
  } catch (err: unknown) {
    return classifyError('openai', err);
  }
}

async function tryGoogle(args: {
  prompt: string;
  width: number;
  height: number;
  size: string;
}): Promise<ProviderOutcome> {
  const { prompt, width, height, size } = args;

  if (!process.env.GOOGLE_AI_API_KEY) {
    return { kind: 'retry', status: 401, message: 'GOOGLE_AI_API_KEY is not set' };
  }

  try {
    const { dataUrl, model, aspectRatio } = await googleImagenGenerate({
      prompt,
      width,
      height,
    });
    // eslint-disable-next-line no-console
    console.log(
      `[ai/image] model=${model} aspect=${aspectRatio} requested=${width}x${height}`,
    );
    const payload: SuccessPayload = {
      dataUrl,
      model,
      size,
      requestedWidth: width,
      requestedHeight: height,
    };
    return { kind: 'success', response: NextResponse.json(payload) };
  } catch (err) {
    return classifyError('google', err);
  }
}

/**
 * Map a thrown provider error to a `ProviderOutcome`. 400 (prompt rejected by
 * safety) is `fatal` — the other provider would likely reject the same
 * prompt, and silently retrying could surface unsafe content. Everything
 * else (auth, quota, model unavailable, network, timeout, 5xx) is `retry` so
 * the caller can try the other provider.
 */
function classifyError(provider: ImageProvider, err: unknown): ProviderOutcome {
  const status =
    err instanceof GoogleImageError ? err.status : getErrorStatus(err);
  const message = err instanceof Error ? err.message : 'Unknown provider error';

  // eslint-disable-next-line no-console
  console.error(`[ai/image] ${provider} error`, { status, message });

  if (status === 400) {
    return {
      kind: 'fatal',
      response: NextResponse.json(
        { error: 'Prompt rejected by image provider', code: 'prompt_rejected', detail: message },
        { status: 400 },
      ),
    };
  }
  return { kind: 'retry', status, message };
}

function providerErrorResponse(
  last: { provider: ImageProvider; status: number; message: string } | null,
): NextResponse {
  if (!last) {
    // Should not happen — order always has at least one provider — but be defensive.
    return NextResponse.json(
      { error: 'No AI image provider configured', code: 'no_provider' },
      { status: 502 },
    );
  }
  const { status, message } = last;
  if (status === 401 || status === 403) {
    return NextResponse.json(
      { error: 'All AI image providers rejected the API key', code: 'provider_auth_error', detail: message },
      { status: 502 },
    );
  }
  if (status === 429) {
    return NextResponse.json(
      { error: 'All AI image providers are rate limited', code: 'provider_rate_limited', detail: message },
      { status: 502 },
    );
  }
  if (status === 504) {
    return NextResponse.json(
      { error: 'AI image providers timed out', code: 'provider_timeout', detail: message },
      { status: 504 },
    );
  }
  return NextResponse.json(
    { error: 'All AI image providers failed', code: 'provider_error', detail: message },
    { status: 502 },
  );
}

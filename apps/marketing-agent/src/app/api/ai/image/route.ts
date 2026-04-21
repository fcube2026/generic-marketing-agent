import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient, IMAGE_MODEL } from '@/lib/ai/openai-client';
import {
  GoogleImageError,
  googleImagenGenerate,
} from '@/lib/ai/google-client';
import { requireMarketingAuth } from '@/lib/ai/auth';
import { checkRateLimit, getClientKey, rateLimitResponse } from '@/lib/ai/rate-limit';
import { pickClosestSize } from '@/lib/ai/image-sizes';
import {
  pollinationsImage,
  POLLINATIONS_IMAGE_MODEL,
  PollinationsError,
} from '@/lib/ai/pollinations';
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

function pollinationsFallback(
  prompt: string,
  width: number,
  height: number,
  size: string,
  reason: string,
): Promise<NextResponse> {
  return pollinationsImage({ prompt, width, height })
    .then(({ dataUrl }) => {
      // eslint-disable-next-line no-console
      console.log(
        `[ai/image] model=${POLLINATIONS_IMAGE_MODEL} (${reason}) requested=${width}x${height}`,
      );
      const payload: SuccessPayload = {
        dataUrl,
        model: POLLINATIONS_IMAGE_MODEL,
        size,
        requestedWidth: width,
        requestedHeight: height,
      };
      return NextResponse.json(payload);
    })
    .catch((fallbackErr: unknown) => {
      const status =
        fallbackErr instanceof PollinationsError ? fallbackErr.status : 502;
      const message =
        fallbackErr instanceof Error ? fallbackErr.message : 'Fallback provider error';
      // eslint-disable-next-line no-console
      console.error(`[ai/image] Pollinations ${reason} failed`, { status, message });
      return NextResponse.json(
        { error: message, code: 'provider_error' },
        { status: 502 },
      );
    });
}

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
  const provider = resolveProvider(body.provider);

  if (provider === 'google') {
    return handleGoogle({ prompt, width, height, size });
  }
  return handleOpenAI({ prompt, width, height, size });
}

async function handleOpenAI(args: {
  prompt: string;
  width: number;
  height: number;
  size: string;
}) {
  const { prompt, width, height, size } = args;

  // Resolve client; on missing key fall back to Pollinations.
  let client: ReturnType<typeof getOpenAIClient>;
  try {
    client = getOpenAIClient();
  } catch {
    return pollinationsFallback(prompt, width, height, size, 'openai-missing-key-fallback');
  }

  try {
    const result = await client.images.generate({
      model: IMAGE_MODEL,
      prompt,
      size: size as '1024x1024' | '1024x1536' | '1536x1024',
      n: 1,
    });

    const item = result.data?.[0];
    const b64 = item?.b64_json;
    const url = item?.url;

    if (!b64 && !url) {
      return NextResponse.json(
        { error: 'Empty response from image provider', code: 'empty_image' },
        { status: 502 },
      );
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
    return NextResponse.json(payload);
  } catch (err: unknown) {
    const status = getErrorStatus(err);
    if (status === 401 || status === 403) {
      // eslint-disable-next-line no-console
      console.warn('[ai/image] OpenAI rejected the API key, falling back to Pollinations');
      return pollinationsFallback(prompt, width, height, size, 'openai-auth-fallback');
    }
    return handleProviderError('openai', err);
  }
}

async function handleGoogle(args: {
  prompt: string;
  width: number;
  height: number;
  size: string;
}) {
  const { prompt, width, height, size } = args;

  // No key configured → straight to Pollinations fallback (parity with OpenAI path).
  if (!process.env.GOOGLE_AI_API_KEY) {
    return pollinationsFallback(prompt, width, height, size, 'google-missing-key-fallback');
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
    return NextResponse.json(payload);
  } catch (err) {
    const status =
      err instanceof GoogleImageError ? err.status : getErrorStatus(err);
    if (status === 401 || status === 403) {
      // eslint-disable-next-line no-console
      console.warn('[ai/image] Google rejected the API key, falling back to Pollinations');
      return pollinationsFallback(prompt, width, height, size, 'google-auth-fallback');
    }
    if (status === 404) {
      // Imagen models (e.g. imagen-3.0-generate-002) require a billing-enabled
      // Google Cloud project; free AI Studio keys get a 404 NOT_FOUND for the
      // `:predict` endpoint. Treat this as "model unavailable on this key" and
      // fall back to Pollinations rather than surfacing a 502 to the UI.
      // eslint-disable-next-line no-console
      console.warn(
        '[ai/image] Google Imagen model unavailable for this API key (404), falling back to Pollinations',
      );
      return pollinationsFallback(prompt, width, height, size, 'google-model-unavailable-fallback');
    }
    return handleProviderError('google', err);
  }
}

function handleProviderError(provider: ImageProvider, err: unknown) {
  const status =
    err instanceof GoogleImageError
      ? err.status
      : typeof err === 'object' && err !== null && 'status' in err && typeof (err as { status: unknown }).status === 'number'
        ? (err as { status: number }).status
        : 500;
  const message = err instanceof Error ? err.message : 'Unknown provider error';

  // eslint-disable-next-line no-console
  console.error(`[ai/image] ${provider} error`, { status, message });

  if (status === 400) {
    // Most common: prompt rejected by safety system.
    return NextResponse.json(
      { error: 'Prompt rejected by image provider', code: 'prompt_rejected', detail: message },
      { status: 400 },
    );
  }
  if (status === 401 || status === 403) {
    return NextResponse.json(
      { error: 'Provider rejected the API key', code: 'provider_auth_error' },
      { status: 502 },
    );
  }
  if (status === 429) {
    return NextResponse.json(
      { error: 'Provider rate limit exceeded', code: 'provider_rate_limited' },
      { status: 502 },
    );
  }
  if (status === 504) {
    return NextResponse.json(
      { error: 'Image provider timed out', code: 'provider_timeout', detail: message },
      { status: 504 },
    );
  }
  return NextResponse.json(
    { error: 'AI provider error', code: 'provider_error', detail: message },
    { status: 502 },
  );
}

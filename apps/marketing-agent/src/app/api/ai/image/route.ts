import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient, IMAGE_MODEL } from '@/lib/ai/openai-client';
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

interface ImageRequestBody {
  prompt?: unknown;
  width?: unknown;
  height?: unknown;
  format?: unknown;
}

function badRequest(message: string, code: string) {
  return NextResponse.json({ error: message, code }, { status: 400 });
}

function asPositiveInt(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
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

  const width = asPositiveInt(body.width, 1024);
  const height = asPositiveInt(body.height, 1024);
  const size = pickClosestSize(width, height);

  // 4. Call OpenAI — or fall back to the free Pollinations provider when no
  //    OPENAI_API_KEY is configured. Returned shape matches the OpenAI path
  //    so the client is unaffected.
  let client: ReturnType<typeof getOpenAIClient>;
  try {
    client = getOpenAIClient();
  } catch {
    try {
      const { dataUrl } = await pollinationsImage({ prompt, width, height });
      // eslint-disable-next-line no-console
      console.log(
        `[ai/image] model=${POLLINATIONS_IMAGE_MODEL} (fallback) requested=${width}x${height}`,
      );
      return NextResponse.json({
        dataUrl,
        model: POLLINATIONS_IMAGE_MODEL,
        size,
        requestedWidth: width,
        requestedHeight: height,
      });
    } catch (fallbackErr) {
      const status =
        fallbackErr instanceof PollinationsError ? fallbackErr.status : 502;
      const message =
        fallbackErr instanceof Error ? fallbackErr.message : 'Fallback provider error';
      // eslint-disable-next-line no-console
      console.error('[ai/image] Pollinations fallback failed', { status, message });
      return NextResponse.json(
        { error: message, code: 'provider_error' },
        { status: 502 },
      );
    }
  }

  try {
    const result = await client.images.generate({
      model: IMAGE_MODEL,
      prompt,
      size,
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

    return NextResponse.json({
      // gpt-image-1 returns b64 by default; older DALL-E models may return a URL.
      // The client should prefer `dataUrl` when present.
      dataUrl: b64 ? `data:image/png;base64,${b64}` : undefined,
      url,
      model: IMAGE_MODEL,
      size,
      requestedWidth: width,
      requestedHeight: height,
    });
  } catch (err: unknown) {
    // If OpenAI rejects our credentials (401/403), transparently fall back to
    // the free Pollinations provider — same behaviour as when no key is set —
    // so a stale/revoked OPENAI_API_KEY does not break the whole experience.
    const status = getErrorStatus(err);
    if (status === 401 || status === 403) {
      // eslint-disable-next-line no-console
      console.warn('[ai/image] OpenAI rejected the API key, falling back to Pollinations');
      try {
        const { dataUrl } = await pollinationsImage({ prompt, width, height });
        // eslint-disable-next-line no-console
        console.log(
          `[ai/image] model=${POLLINATIONS_IMAGE_MODEL} (auth-fallback) requested=${width}x${height}`,
        );
        return NextResponse.json({
          dataUrl,
          model: POLLINATIONS_IMAGE_MODEL,
          size,
          requestedWidth: width,
          requestedHeight: height,
        });
      } catch (fallbackErr) {
        const fbStatus =
          fallbackErr instanceof PollinationsError ? fallbackErr.status : 502;
        const message =
          fallbackErr instanceof Error ? fallbackErr.message : 'Fallback provider error';
        // eslint-disable-next-line no-console
        console.error('[ai/image] Pollinations auth-fallback failed', { status: fbStatus, message });
        // fall through to the original error handler
      }
    }
    return handleOpenAIError(err);
  }
}

function handleOpenAIError(err: unknown) {
  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof (err as { status: unknown }).status === 'number'
      ? (err as { status: number }).status
      : 500;
  const message = err instanceof Error ? err.message : 'Unknown provider error';

  // eslint-disable-next-line no-console
  console.error('[ai/image] OpenAI error', { status, message });

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
  return NextResponse.json(
    { error: 'AI provider error', code: 'provider_error', detail: message },
    { status: 502 },
  );
}

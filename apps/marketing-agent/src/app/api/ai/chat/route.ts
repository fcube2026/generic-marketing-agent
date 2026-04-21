import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient, TEXT_MODEL } from '@/lib/ai/openai-client';
import {
  googleChat,
  GoogleChatError,
  GOOGLE_TEXT_MODEL,
} from '@/lib/ai/google-client';
import { requireMarketingAuth } from '@/lib/ai/auth';
import { checkRateLimit, getClientKey, rateLimitResponse } from '@/lib/ai/rate-limit';
import {
  pollinationsChat,
  POLLINATIONS_TEXT_MODEL,
  PollinationsError,
} from '@/lib/ai/pollinations';
import { getErrorStatus } from '@/lib/ai/error-utils';

// We talk to OpenAI from the route handler — keep us on the Node.js runtime.
export const runtime = 'nodejs';
// Don't cache responses; every chat call is unique.
export const dynamic = 'force-dynamic';

const MAX_MESSAGES = 20;
const MAX_CONTENT_CHARS = 4000;
const MAX_TOTAL_CHARS = 16000;
const MAX_TOKENS = 800;
const MAX_SYSTEM_CHARS = 4000;

const DEFAULT_SYSTEM_PROMPT = `You are the curex24 AI Marketing Agent — an expert hands-on CMO and growth operator for curex24, an Indian healthtech brand offering at-home doctor visits, diagnostics and pharmacy delivery in Mumbai, Delhi and Bengaluru.

Your job is to help the founder/marketing team plan, write and ship marketing work end-to-end:
- Strategy: positioning, GTM, channel mix, budget allocation, ICP.
- Campaigns: briefs, ad copy (Google, Meta, LinkedIn, YouTube), landing pages.
- Content: social posts, carousels, scripts, blog/SEO outlines, email flows.
- Lifecycle & retention: onboarding emails, re-engagement, churn analysis.
- Analytics: KPI framing, experiment design, simple back-of-envelope maths.

Style:
- Be concrete, specific to curex24 and the Indian healthcare context.
- Use short headings, bullet lists, and ready-to-ship copy with clear CTAs.
- Quote prices in ₹ (INR). Mention Mumbai / Delhi / Bengaluru where relevant.
- Be honest about uncertainty; flag assumptions and recommended next steps.
- Never invent specific patient names, doctor names, or fabricated testimonials.

If the user asks for an image / visual / poster, suggest a vivid generation prompt (1–2 sentences) and recommend they use the Visual Generator. Do not embed image URLs.`;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

type TextProvider = 'openai' | 'google';

interface ChatRequestBody {
  messages?: unknown;
  system?: unknown;
  provider?: unknown;
}

function badRequest(message: string, code: string) {
  return NextResponse.json({ error: message, code }, { status: 400 });
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    (v.role === 'user' || v.role === 'assistant' || v.role === 'system') &&
    typeof v.content === 'string'
  );
}

function resolveTextProvider(value: unknown): TextProvider {
  if (value === 'openai' || value === 'google') return value;
  const env = process.env.AI_TEXT_PROVIDER?.toLowerCase();
  if (env === 'google') return 'google';
  return 'openai';
}

async function pollinationsChatFallback(
  system: string,
  messages: ChatMessage[],
  reason: string,
): Promise<NextResponse> {
  try {
    const reply = await pollinationsChat({ system, messages });
    // eslint-disable-next-line no-console
    console.log(`[ai/chat] model=${POLLINATIONS_TEXT_MODEL} (${reason})`);
    return NextResponse.json({ reply, model: POLLINATIONS_TEXT_MODEL });
  } catch (fallbackErr) {
    const status = fallbackErr instanceof PollinationsError ? fallbackErr.status : 502;
    const message =
      fallbackErr instanceof Error ? fallbackErr.message : 'Fallback provider error';
    // eslint-disable-next-line no-console
    console.error(`[ai/chat] Pollinations ${reason} failed`, { status, message });
    return NextResponse.json(
      { error: message, code: 'provider_error' },
      { status: 502 },
    );
  }
}

export async function POST(req: NextRequest) {
  // 1. Auth
  const auth = await requireMarketingAuth(req);
  if (!auth.ok) return auth.response;

  // 2. Rate limit (per-user via token)
  const rl = checkRateLimit(`ai-chat:${getClientKey(req)}`, { max: 30, windowMs: 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl);

  // 3. Parse + validate body
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return badRequest('Body must be valid JSON', 'invalid_json');
  }

  if (!Array.isArray(body.messages)) {
    return badRequest('`messages` must be an array', 'invalid_messages');
  }
  if (body.messages.length === 0) {
    return badRequest('`messages` must not be empty', 'invalid_messages');
  }
  if (body.messages.length > MAX_MESSAGES) {
    return badRequest(
      `Too many messages (max ${MAX_MESSAGES}). Trim conversation history.`,
      'too_many_messages',
    );
  }
  if (!body.messages.every(isChatMessage)) {
    return badRequest(
      'Each message must be { role: "user"|"assistant"|"system", content: string }',
      'invalid_messages',
    );
  }
  const messages = body.messages as ChatMessage[];

  let totalChars = 0;
  for (const m of messages) {
    if (m.content.length > MAX_CONTENT_CHARS) {
      return badRequest(
        `Message content exceeds ${MAX_CONTENT_CHARS} characters`,
        'message_too_long',
      );
    }
    totalChars += m.content.length;
  }
  if (totalChars > MAX_TOTAL_CHARS) {
    return badRequest(
      `Conversation exceeds ${MAX_TOTAL_CHARS} characters total`,
      'conversation_too_long',
    );
  }

  let systemPrompt = DEFAULT_SYSTEM_PROMPT;
  if (typeof body.system === 'string' && body.system.trim()) {
    if (body.system.length > MAX_SYSTEM_CHARS) {
      return badRequest(
        `system prompt exceeds ${MAX_SYSTEM_CHARS} characters`,
        'system_too_long',
      );
    }
    // Append caller-provided context to the default brand prompt rather than
    // letting the client wholesale replace it.
    systemPrompt = `${DEFAULT_SYSTEM_PROMPT}\n\nAdditional context:\n${body.system.trim()}`;
  }

  if (
    body.provider !== undefined &&
    body.provider !== 'openai' &&
    body.provider !== 'google'
  ) {
    return badRequest('`provider` must be "openai" or "google"', 'invalid_provider');
  }
  const provider = resolveTextProvider(body.provider);

  if (provider === 'google') {
    return handleGoogle({ systemPrompt, messages });
  }
  return handleOpenAI({ systemPrompt, messages });
}

async function handleOpenAI({
  systemPrompt,
  messages,
}: {
  systemPrompt: string;
  messages: ChatMessage[];
}) {
  // 4. Call OpenAI — or fall back to the free Pollinations provider if no key
  //    is configured. This keeps the agent usable in local/dev/preview
  //    environments without a paid OPENAI_API_KEY.
  let client: ReturnType<typeof getOpenAIClient>;
  try {
    client = getOpenAIClient();
  } catch {
    return pollinationsChatFallback(systemPrompt, messages, 'openai-missing-key-fallback');
  }

  try {
    const completion = await client.chat.completions.create({
      model: TEXT_MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0.7,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() ?? '';
    if (!reply) {
      return NextResponse.json(
        { error: 'Empty response from model', code: 'empty_reply' },
        { status: 502 },
      );
    }

    const usage = completion.usage;
    if (usage) {
      // Lightweight per-request usage log (no PII).
      // eslint-disable-next-line no-console
      console.log(
        `[ai/chat] model=${TEXT_MODEL} prompt=${usage.prompt_tokens} completion=${usage.completion_tokens} total=${usage.total_tokens}`,
      );
    }

    return NextResponse.json({
      reply,
      model: TEXT_MODEL,
      usage: usage
        ? {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
          }
        : undefined,
    });
  } catch (err: unknown) {
    // If OpenAI rejects our credentials (401/403), transparently fall back to
    // the free Pollinations provider — same behaviour as when no key is set —
    // so a stale/revoked OPENAI_API_KEY does not break the whole experience.
    const status = getErrorStatus(err);
    if (status === 401 || status === 403) {
      // eslint-disable-next-line no-console
      console.warn('[ai/chat] OpenAI rejected the API key, falling back to Pollinations');
      return pollinationsChatFallback(systemPrompt, messages, 'openai-auth-fallback');
    }
    return handleProviderError('openai', err);
  }
}

async function handleGoogle({
  systemPrompt,
  messages,
}: {
  systemPrompt: string;
  messages: ChatMessage[];
}) {
  // No key configured → Pollinations fallback (parity with the image route).
  if (!process.env.GOOGLE_AI_API_KEY) {
    return pollinationsChatFallback(systemPrompt, messages, 'google-missing-key-fallback');
  }

  try {
    const { reply, model, usage } = await googleChat({
      system: systemPrompt,
      messages,
      maxOutputTokens: MAX_TOKENS,
      temperature: 0.7,
    });

    if (usage) {
      // eslint-disable-next-line no-console
      console.log(
        `[ai/chat] model=${model} prompt=${usage.promptTokens} completion=${usage.completionTokens} total=${usage.totalTokens}`,
      );
    } else {
      // eslint-disable-next-line no-console
      console.log(`[ai/chat] model=${model}`);
    }

    return NextResponse.json({ reply, model, usage });
  } catch (err) {
    const status =
      err instanceof GoogleChatError ? err.status : getErrorStatus(err);
    if (status === 401 || status === 403) {
      // eslint-disable-next-line no-console
      console.warn('[ai/chat] Google rejected the API key, falling back to Pollinations');
      return pollinationsChatFallback(systemPrompt, messages, 'google-auth-fallback');
    }
    if (status === 404) {
      // Free AI Studio keys return 404 for models not enabled on the project
      // (e.g. older `gemini-pro`). Fall back to Pollinations rather than 502.
      // eslint-disable-next-line no-console
      console.warn(
        `[ai/chat] Google text model unavailable for this API key (404) — check GOOGLE_AI_TEXT_MODEL (current: ${GOOGLE_TEXT_MODEL}). Falling back to Pollinations.`,
      );
      return pollinationsChatFallback(systemPrompt, messages, 'google-model-unavailable-fallback');
    }
    return handleProviderError('google', err);
  }
}

function handleProviderError(provider: TextProvider, err: unknown) {
  const status =
    err instanceof GoogleChatError ? err.status : getErrorStatus(err);
  const message = err instanceof Error ? err.message : 'Unknown provider error';

  // eslint-disable-next-line no-console
  console.error(`[ai/chat] ${provider} error`, { status, message });

  if (status === 400) {
    return NextResponse.json(
      { error: 'Prompt rejected by provider', code: 'prompt_rejected', detail: message },
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
      { error: 'Provider timed out', code: 'provider_timeout', detail: message },
      { status: 504 },
    );
  }
  return NextResponse.json(
    { error: 'AI provider error', code: 'provider_error', detail: message },
    { status: 502 },
  );
}


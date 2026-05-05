import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient, TEXT_MODEL } from '@/lib/ai/openai-client';
import {
  googleChat,
  GoogleChatError,
} from '@/lib/ai/google-client';
import { requireMarketingAuth } from '@/lib/ai/auth';
import { checkRateLimit, getClientKey, rateLimitResponse } from '@/lib/ai/rate-limit';
import { getErrorStatus } from '@/lib/ai/error-utils';
import { pollinationsChat, POLLINATIONS_TEXT_MODEL, PollinationsError } from '@/lib/ai/pollinations';

// We talk to OpenAI from the route handler — keep us on the Node.js runtime.
export const runtime = 'nodejs';
// Don't cache responses; every chat call is unique.
export const dynamic = 'force-dynamic';

const MAX_MESSAGES = 20;
const MAX_CONTENT_CHARS = 4000;
const MAX_TOTAL_CHARS = 16000;
const MAX_TOKENS = 800;
const MAX_SYSTEM_CHARS = 4000;

const DEFAULT_SYSTEM_PROMPT = `You are an AI Marketing Agent — a versatile assistant that helps users with marketing work for any brand, product, industry or topic, and can also answer general questions when asked.

Your job is to help the user plan, write and ship marketing work end-to-end whenever that is what they need:
- Strategy: positioning, GTM, channel mix, budget allocation, ICP.
- Campaigns: briefs, ad copy (Google, Meta, LinkedIn, YouTube, TikTok, etc.), landing pages.
- Content: social posts, carousels, scripts, blog/SEO outlines, email flows.
- Lifecycle & retention: onboarding emails, re-engagement, churn analysis.
- Analytics: KPI framing, experiment design, simple back-of-envelope maths.

Beyond marketing, answer any other question the user asks to the best of your ability, including general knowledge, writing, coding, research, brainstorming, and casual conversation. Do not refuse a question simply because it is not about marketing.

Style:
- Adapt to the user's brand, industry, geography, language and currency. Do not assume any specific company, product or country unless the user provides one.
- Use short headings, bullet lists, and ready-to-ship copy with clear CTAs when producing marketing deliverables.
- Be honest about uncertainty; flag assumptions and recommended next steps.
- Never invent specific people, customers, prices or fabricated testimonials. Ask the user for missing facts instead of making them up.

If the user asks for an image / visual / poster, suggest a vivid generation prompt (1–2 sentences) and recommend they use the Visual Generator. Do not embed image URLs.

If the caller provides additional context or brand guidelines via the system prompt, treat those as authoritative and follow them.`;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

type TextProvider = 'openai' | 'google' | 'pollinations';

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

/** Outcome of trying a single text provider. */
type ProviderOutcome =
  | { kind: 'success'; response: NextResponse }
  | { kind: 'fatal'; response: NextResponse } // e.g. prompt rejected — don't try the other provider
  | { kind: 'retry'; status: number; message: string };

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
    // Caller-provided system prompts fully replace the default so the agent
    // can be repurposed for any brand, topic, or use case without inheriting
    // a generic marketing framing it doesn't need.
    systemPrompt = body.system.trim();
  }

  if (
    body.provider !== undefined &&
    body.provider !== 'openai' &&
    body.provider !== 'google'
  ) {
    return badRequest('`provider` must be "openai" or "google"', 'invalid_provider');
  }
  const preferred = resolveTextProvider(body.provider);

  // Try preferred provider first, then the other. If a provider is missing
  // its API key it cleanly returns a `retry` outcome so we fall through to
  // the alternative without surfacing an error to the user. Pollinations is
  // always last as a free no-key fallback for dev/preview environments.
  const order: TextProvider[] = [preferred, preferred === 'openai' ? 'google' : 'openai', 'pollinations'];

  let lastRetry: { provider: TextProvider; status: number; message: string } | null = null;
  for (const provider of order) {
    const outcome =
      provider === 'openai'
        ? await tryOpenAI({ systemPrompt, messages })
        : provider === 'google'
          ? await tryGoogle({ systemPrompt, messages })
          : await tryPollinations({ systemPrompt, messages });

    if (outcome.kind === 'success' || outcome.kind === 'fatal') {
      return outcome.response;
    }
    // eslint-disable-next-line no-console
    console.warn(
      `[ai/chat] provider=${provider} failed (status=${outcome.status}); ${order.indexOf(provider) + 1 < order.length ? 'trying next provider' : 'no more providers'}`,
    );
    lastRetry = { provider, status: outcome.status, message: outcome.message };
  }

  return providerErrorResponse(lastRetry);
}

async function tryOpenAI({
  systemPrompt,
  messages,
}: {
  systemPrompt: string;
  messages: ChatMessage[];
}): Promise<ProviderOutcome> {
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
    const completion = await client.chat.completions.create({
      model: TEXT_MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0.7,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() ?? '';
    if (!reply) {
      return { kind: 'retry', status: 502, message: 'OpenAI returned an empty reply' };
    }

    const usage = completion.usage;
    if (usage) {
      // Lightweight per-request usage log (no PII).
      // eslint-disable-next-line no-console
      console.log(
        `[ai/chat] model=${TEXT_MODEL} prompt=${usage.prompt_tokens} completion=${usage.completion_tokens} total=${usage.total_tokens}`,
      );
    }

    return {
      kind: 'success',
      response: NextResponse.json({
        reply,
        model: TEXT_MODEL,
        usage: usage
          ? {
              promptTokens: usage.prompt_tokens,
              completionTokens: usage.completion_tokens,
              totalTokens: usage.total_tokens,
            }
          : undefined,
      }),
    };
  } catch (err: unknown) {
    return classifyError('openai', err);
  }
}

async function tryGoogle({
  systemPrompt,
  messages,
}: {
  systemPrompt: string;
  messages: ChatMessage[];
}): Promise<ProviderOutcome> {
  if (!process.env.GOOGLE_AI_API_KEY) {
    return { kind: 'retry', status: 401, message: 'GOOGLE_AI_API_KEY is not set' };
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

    return { kind: 'success', response: NextResponse.json({ reply, model, usage }) };
  } catch (err) {
    return classifyError('google', err);
  }
}

async function tryPollinations({
  systemPrompt,
  messages,
}: {
  systemPrompt: string;
  messages: ChatMessage[];
}): Promise<ProviderOutcome> {
  try {
    const reply = await pollinationsChat({ system: systemPrompt, messages });
    if (!reply) {
      return { kind: 'retry', status: 502, message: 'Pollinations returned an empty reply' };
    }
    // eslint-disable-next-line no-console
    console.log(`[ai/chat] model=${POLLINATIONS_TEXT_MODEL} (pollinations fallback)`);
    return {
      kind: 'success',
      response: NextResponse.json({ reply, model: POLLINATIONS_TEXT_MODEL }),
    };
  } catch (err) {
    const status = err instanceof PollinationsError ? err.status : 502;
    const message = err instanceof Error ? err.message : 'Pollinations chat failed';
    // eslint-disable-next-line no-console
    console.error('[ai/chat] pollinations error', { status, message });
    return { kind: 'retry', status, message };
  }
}

/**
 * Map a thrown provider error to a `ProviderOutcome`. 400 (prompt rejected
 * by safety) is `fatal` — the other provider would likely reject the same
 * prompt and silently retrying could surface unsafe content. All other
 * statuses (auth, quota, model unavailable, network, timeout, 5xx) are
 * `retry` so the caller can try the alternative provider.
 */
function classifyError(provider: TextProvider, err: unknown): ProviderOutcome {
  const status =
    err instanceof GoogleChatError ? err.status : getErrorStatus(err);
  const message = err instanceof Error ? err.message : 'Unknown provider error';

  // eslint-disable-next-line no-console
  console.error(`[ai/chat] ${provider} error`, { status, message });

  if (status === 400) {
    return {
      kind: 'fatal',
      response: NextResponse.json(
        { error: 'Prompt rejected by provider', code: 'prompt_rejected', detail: message },
        { status: 400 },
      ),
    };
  }
  return { kind: 'retry', status, message };
}

function providerErrorResponse(
  last: { provider: TextProvider; status: number; message: string } | null,
): NextResponse {
  if (!last) {
    return NextResponse.json(
      { error: 'No AI text provider configured', code: 'no_provider' },
      { status: 502 },
    );
  }
  const { status, message } = last;
  if (status === 401 || status === 403) {
    return NextResponse.json(
      { error: 'All AI text providers rejected the API key', code: 'provider_auth_error', detail: message },
      { status: 502 },
    );
  }
  if (status === 429) {
    return NextResponse.json(
      { error: 'All AI text providers are rate limited', code: 'provider_rate_limited', detail: message },
      { status: 502 },
    );
  }
  if (status === 504) {
    return NextResponse.json(
      { error: 'AI text providers timed out', code: 'provider_timeout', detail: message },
      { status: 504 },
    );
  }
  return NextResponse.json(
    { error: 'All AI text providers failed', code: 'provider_error', detail: message },
    { status: 502 },
  );
}

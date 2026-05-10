import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient, TEXT_MODEL } from '@/lib/ai/openai-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_MESSAGES = 10;
const MAX_CONTENT_CHARS = 6000;
const MAX_TOTAL_CHARS = 24000;
const MAX_SYSTEM_CHARS = 12000;
const MAX_TOKENS = 1800;

type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

interface ChatRequestBody {
  messages?: unknown;
  system?: unknown;
}

function badRequest(message: string, code: string) {
  return NextResponse.json({ error: message, code }, { status: 400 });
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    (candidate.role === 'user' || candidate.role === 'assistant' || candidate.role === 'system') &&
    typeof candidate.content === 'string'
  );
}

export async function POST(req: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return badRequest('Body must be valid JSON', 'invalid_json');
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return badRequest('`messages` must be a non-empty array', 'invalid_messages');
  }
  if (body.messages.length > MAX_MESSAGES) {
    return badRequest(`Too many messages (max ${MAX_MESSAGES})`, 'too_many_messages');
  }
  if (!body.messages.every(isChatMessage)) {
    return badRequest(
      'Each message must be { role: "user"|"assistant"|"system", content: string }',
      'invalid_messages',
    );
  }

  const messages = body.messages as ChatMessage[];
  let totalChars = 0;
  for (const message of messages) {
    if (message.content.length > MAX_CONTENT_CHARS) {
      return badRequest(`Message content exceeds ${MAX_CONTENT_CHARS} characters`, 'message_too_long');
    }
    totalChars += message.content.length;
  }
  if (totalChars > MAX_TOTAL_CHARS) {
    return badRequest(`Conversation exceeds ${MAX_TOTAL_CHARS} characters total`, 'conversation_too_long');
  }

  const systemPrompt = typeof body.system === 'string' ? body.system.trim() : '';
  if (!systemPrompt) {
    return badRequest('`system` is required', 'invalid_system');
  }
  if (systemPrompt.length > MAX_SYSTEM_CHARS) {
    return badRequest(`system prompt exceeds ${MAX_SYSTEM_CHARS} characters`, 'system_too_long');
  }

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: TEXT_MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0.7,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() ?? '';
    if (!reply) {
      return NextResponse.json({ error: 'OpenAI returned an empty reply', code: 'empty_reply' }, { status: 502 });
    }

    const usage = completion.usage;
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chat request failed';
    return NextResponse.json({ error: message, code: 'chat_failed' }, { status: 500 });
  }
}

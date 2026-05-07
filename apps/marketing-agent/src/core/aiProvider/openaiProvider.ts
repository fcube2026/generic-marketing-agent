/**
 * OpenAI implementation of `AiProvider`. Wraps the `openai` SDK that's
 * already a direct dependency of marketing-agent.
 *
 * We keep this thin: prompt templating, guardrails and retries are the
 * caller's responsibility — this just adapts the SDK shape onto our
 * provider-agnostic interface.
 */

import type {
  AiProvider,
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  EmbedRequest,
  EmbedResponse,
  ImageRequest,
  ImageResponse,
} from './types';

interface OpenAiOptions {
  apiKey?: string;
  baseURL?: string;
  organization?: string;
  defaultModel?: string;
  defaultEmbedModel?: string;
  defaultImageModel?: string;
}

type OpenAIClient = {
  chat: { completions: { create: (args: unknown) => Promise<unknown> } };
  embeddings: { create: (args: unknown) => Promise<unknown> };
  images: { generate: (args: unknown) => Promise<unknown> };
};

export class OpenAiProvider implements AiProvider {
  readonly name = 'openai';
  readonly capabilities = { chat: true, streamChat: true, embed: true, image: true };
  private clientPromise: Promise<OpenAIClient> | null = null;

  constructor(private readonly opts: OpenAiOptions | Record<string, unknown>) {}

  private get options(): OpenAiOptions {
    return this.opts as OpenAiOptions;
  }

  private async client(): Promise<OpenAIClient> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const mod = (await import('openai')) as {
          default: new (cfg: unknown) => OpenAIClient;
        };
        const apiKey = this.options.apiKey ?? process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error(
            'OpenAiProvider: OPENAI_API_KEY is not set (and no apiKey passed in agent.config).',
          );
        }
        return new mod.default({
          apiKey,
          baseURL: this.options.baseURL,
          organization: this.options.organization,
        });
      })();
    }
    return this.clientPromise;
  }

  private buildMessages(req: ChatRequest): ChatRequest['messages'] {
    return req.system
      ? [{ role: 'system', content: req.system }, ...req.messages]
      : req.messages;
  }

  private model(req: ChatRequest): string {
    const meta = req.metadata as { model?: string } | undefined;
    return meta?.model ?? this.options.defaultModel ?? process.env.AI_TEXT_MODEL ?? 'gpt-4o-mini';
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const client = await this.client();
    const model = this.model(req);
    const res = (await client.chat.completions.create({
      model,
      messages: this.buildMessages(req),
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens,
    })) as {
      choices: { message: { content: string }; finish_reason?: string }[];
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    const choice = res.choices?.[0];
    return {
      reply: choice?.message?.content ?? '',
      model: res.model ?? model,
      finishReason: choice?.finish_reason,
      usage: res.usage
        ? {
            promptTokens: res.usage.prompt_tokens,
            completionTokens: res.usage.completion_tokens,
            totalTokens: res.usage.total_tokens,
          }
        : undefined,
    };
  }

  async *streamChat(req: ChatRequest): AsyncIterable<ChatStreamChunk> {
    const client = await this.client();
    const model = this.model(req);
    const stream = (await client.chat.completions.create({
      model,
      messages: this.buildMessages(req),
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens,
      stream: true,
    })) as AsyncIterable<{
      choices: { delta?: { content?: string }; finish_reason?: string }[];
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    }>;

    let usage: ChatStreamChunk['usage'];
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content ?? '';
      if (chunk.usage) {
        usage = {
          promptTokens: chunk.usage.prompt_tokens,
          completionTokens: chunk.usage.completion_tokens,
          totalTokens: chunk.usage.total_tokens,
        };
      }
      if (delta) yield { delta, done: false };
    }
    yield { delta: '', done: true, usage };
  }

  async embed(req: EmbedRequest): Promise<EmbedResponse> {
    const client = await this.client();
    const model = req.model ?? this.options.defaultEmbedModel ?? 'text-embedding-3-small';
    const res = (await client.embeddings.create({ model, input: req.input })) as {
      data: { embedding: number[] }[];
      model: string;
      usage?: { total_tokens: number };
    };
    return {
      vectors: res.data.map((d) => d.embedding),
      model: res.model ?? model,
      usage: res.usage ? { totalTokens: res.usage.total_tokens } : undefined,
    };
  }

  async image(req: ImageRequest): Promise<ImageResponse> {
    const client = await this.client();
    const model = this.options.defaultImageModel ?? 'gpt-image-1';
    const w = req.width ?? 1024;
    const h = req.height ?? 1024;
    const res = (await client.images.generate({
      model,
      prompt: req.prompt,
      size: `${w}x${h}`,
    })) as { data: { url?: string; b64_json?: string }[] };
    const item = res.data?.[0];
    const url = item?.url
      ? item.url
      : item?.b64_json
        ? `data:image/${req.format ?? 'png'};base64,${item.b64_json}`
        : '';
    if (!url) throw new Error('OpenAiProvider: image response had neither url nor b64_json.');
    return { url, model };
  }
}

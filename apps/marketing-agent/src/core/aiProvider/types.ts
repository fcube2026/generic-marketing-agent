/**
 * `AiProvider` — the model-agnostic seam.
 *
 * Routes (`/api/ai/chat`, `/api/ai/critique`, `/api/ai/image`) and the skill
 * runner all call into this interface, so swapping providers is a one-line
 * change in `agent.config.ts`. Stream support lets long generations flow
 * straight to the browser via SSE / `ReadableStream` without buffering.
 *
 * Today's provider-specific code in `src/lib/ai/openai-client.ts` and
 * `src/lib/ai/google-client.ts` becomes one implementation each of this
 * interface.
 */

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatTurn[];
  /** Convenience: prepended to `messages` as a `system` turn if set. */
  system?: string;
  /** 0–2; provider-specific. */
  temperature?: number;
  /** Hard cap on output tokens. Providers may clamp further. */
  maxTokens?: number;
  /** Free-form per-provider hints ({{ model: 'gpt-4o-mini' }} etc.). */
  metadata?: Record<string, unknown>;
}

export interface ChatUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatResponse {
  reply: string;
  /** Identifier of the actual model used (e.g. `gpt-4o-mini`). */
  model: string;
  usage?: ChatUsage;
  /** Provider-specific finish reason (`stop`, `length`, `content_filter`, …). */
  finishReason?: string;
}

/** Streaming chunk emitted by `streamChat`. */
export interface ChatStreamChunk {
  delta: string;
  /** True on the last chunk; usage is only present here. */
  done: boolean;
  usage?: ChatUsage;
}

export interface EmbedRequest {
  input: string | string[];
  model?: string;
}

export interface EmbedResponse {
  vectors: number[][];
  model: string;
  usage?: { totalTokens: number };
}

export interface ImageRequest {
  prompt: string;
  width?: number;
  height?: number;
  /** Returned as a data: URL when the provider doesn't host the image. */
  format?: 'png' | 'jpeg' | 'webp';
}

export interface ImageResponse {
  /** Either an https URL or a `data:` URL. */
  url: string;
  model: string;
}

export interface AiProvider {
  readonly name: string;
  readonly capabilities: {
    chat: boolean;
    streamChat: boolean;
    embed: boolean;
    image: boolean;
  };

  chat(req: ChatRequest): Promise<ChatResponse>;

  /** Optional — falls back to non-streaming `chat` when not implemented. */
  streamChat?(req: ChatRequest): AsyncIterable<ChatStreamChunk>;

  embed?(req: EmbedRequest): Promise<EmbedResponse>;
  image?(req: ImageRequest): Promise<ImageResponse>;
}

export class AiCapabilityNotSupportedError extends Error {
  constructor(provider: string, capability: string) {
    super(`AI provider "${provider}" does not implement "${capability}".`);
    this.name = 'AiCapabilityNotSupportedError';
  }
}

/**
 * Deterministic `AiProvider` for tests, previews, and offline dev.
 *
 * Echoes a templated response so tests can assert on the input the provider
 * received without depending on a network model. Keeps `e2e` and the
 * "is the wiring correct?" smoke tests fast and free.
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

export class MockAiProvider implements AiProvider {
  readonly name = 'mock';
  readonly capabilities = { chat: true, streamChat: true, embed: true, image: true };

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const last = [...req.messages].reverse().find((m) => m.role === 'user');
    const reply = `[mock] ${last?.content?.slice(0, 200) ?? '(no user turn)'}`;
    return {
      reply,
      model: 'mock',
      usage: {
        promptTokens: estimateTokens(req),
        completionTokens: Math.ceil(reply.length / 4),
        totalTokens: estimateTokens(req) + Math.ceil(reply.length / 4),
      },
      finishReason: 'stop',
    };
  }

  async *streamChat(req: ChatRequest): AsyncIterable<ChatStreamChunk> {
    const { reply, usage } = await this.chat(req);
    const words = reply.split(/(\s+)/);
    for (let i = 0; i < words.length; i += 1) {
      yield { delta: words[i], done: false };
    }
    yield { delta: '', done: true, usage };
  }

  async embed(req: EmbedRequest): Promise<EmbedResponse> {
    const inputs = Array.isArray(req.input) ? req.input : [req.input];
    const vectors = inputs.map((s) => deterministicVector(s, 16));
    return {
      vectors,
      model: 'mock-embed',
      usage: { totalTokens: inputs.reduce((n, s) => n + Math.ceil(s.length / 4), 0) },
    };
  }

  async image(req: ImageRequest): Promise<ImageResponse> {
    // 1×1 transparent PNG.
    const tinyPng =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=';
    return {
      url: `data:image/png;base64,${tinyPng}`,
      model: `mock-image (${req.width ?? 1024}x${req.height ?? 1024})`,
    };
  }
}

function estimateTokens(req: ChatRequest): number {
  const text =
    (req.system ?? '') + req.messages.map((m) => m.content ?? '').join(' ');
  return Math.ceil(text.length / 4);
}

function deterministicVector(s: string, dim: number): number[] {
  const out = new Array(dim).fill(0);
  for (let i = 0; i < s.length; i += 1) out[i % dim] = (out[i % dim] + s.charCodeAt(i)) % 997;
  const max = Math.max(1, ...out.map(Math.abs));
  return out.map((x) => x / max);
}

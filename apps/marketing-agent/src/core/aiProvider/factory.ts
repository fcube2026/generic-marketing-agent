/**
 * AiProvider factory. Same dynamic-import pattern as `dataSource/factory.ts`
 * — provider SDKs (`openai`, `@anthropic-ai/sdk`, `@google/generative-ai`,
 * `ollama`) are loaded only when their branch is selected.
 *
 * Today's app already ships `openai` and `@google/generative-ai` as direct
 * deps, so those branches are safe to bundle. Anthropic / Ollama providers
 * stay optional.
 */

import type { AiProvider } from './types';
import { MockAiProvider } from './mockProvider';

export type AiProviderKind =
  | 'mock'
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'ollama';

export interface AiProviderConfig {
  kind: AiProviderKind;
  /** Provider-specific options (model id, base URL, organization id, …). */
  options?: Record<string, unknown>;
}

let cached: { key: string; provider: AiProvider } | null = null;

export async function createAiProvider(config: AiProviderConfig): Promise<AiProvider> {
  const cacheKey = JSON.stringify({ k: config.kind, o: config.options ?? {} });
  if (cached && cached.key === cacheKey) return cached.provider;

  let provider: AiProvider;
  switch (config.kind) {
    case 'mock':
      provider = new MockAiProvider();
      break;

    case 'openai': {
      const mod = await import('./openaiProvider');
      provider = new mod.OpenAiProvider(config.options ?? {});
      break;
    }

    case 'anthropic':
    case 'google':
    case 'ollama':
      // Stubs — fall back to mock with a clear log so misconfigured deploys
      // don't 500. Each can become a real adapter following the
      // `OpenAiProvider` template.
      // eslint-disable-next-line no-console
      console.warn(
        `[agent] AiProvider "${config.kind}" is not implemented yet — falling back to MockAiProvider.`,
      );
      provider = new MockAiProvider();
      break;

    default: {
      const exhaustive: never = config.kind;
      throw new Error(`Unknown AiProvider kind: ${String(exhaustive)}`);
    }
  }

  cached = { key: cacheKey, provider };
  return provider;
}

export function resetAiProviderCache(): void {
  cached = null;
}

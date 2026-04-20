import axios from 'axios';

import api from '../api';

/**
 * Client-side wrappers around the marketing-agent's own server-side AI routes
 * (`/api/ai/chat` and `/api/ai/image`). The routes call OpenAI on the server
 * so the API key never reaches the browser.
 *
 * Auth & base URL piggy-back on the existing axios `api` instance — the JWT
 * stored under `marketing_token` is automatically attached, and the shared
 * 401-handler will log the user out if the upstream backend rejects them.
 *
 * Note: these endpoints live under `/api/ai/*` (NOT `/api/backend/*`), so we
 * deliberately bypass the `baseURL = '/api/backend'` of the shared `api`
 * instance by passing absolute paths.
 */

export interface ChatTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GenerateChatReplyInput {
  messages: ChatTurn[];
  /** Optional extra brand/profile context appended to the default system prompt. */
  system?: string;
}

export interface GenerateChatReplyResult {
  reply: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export async function generateChatReply(
  input: GenerateChatReplyInput,
): Promise<GenerateChatReplyResult> {
  const { data } = await api.post<GenerateChatReplyResult>('/api/ai/chat', input, {
    // Override the shared baseURL so we hit the local Next.js route, not the API.
    baseURL: '/',
  });
  return data;
}

export interface GenerateImageInput {
  prompt: string;
  width?: number;
  height?: number;
  /** Optional client-side hint, currently informational only. */
  format?: string;
}

export interface GenerateImageResult {
  /** Base64 data URL — preferred. */
  dataUrl?: string;
  /** Hosted URL (older models) — fallback. */
  url?: string;
  model: string;
  size: string;
  requestedWidth: number;
  requestedHeight: number;
}

export async function generateImage(
  input: GenerateImageInput,
): Promise<GenerateImageResult> {
  const { data } = await api.post<GenerateImageResult>('/api/ai/image', input, {
    baseURL: '/',
  });
  return data;
}

/**
 * Convenience: surface a friendly error message from an axios error returned
 * by either AI route.  Server returns `{ error, code, ... }`.
 */
export function describeAiError(err: unknown, fallback = 'AI request failed'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string; code?: string } | undefined;
    if (data?.error) return data.error;
    return err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

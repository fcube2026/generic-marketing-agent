export interface PublishLandingPageInput {
  html: string;
}

export interface PublishLandingPageResult {
  id: string;
  path: string;
  url: string;
  title: string | null;
  createdAt: number;
}

export async function publishLandingPagePreview(
  input: PublishLandingPageInput,
): Promise<PublishLandingPageResult> {
  const response = await fetch('/api/landing-page/preview', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const data = (await response.json()) as PublishLandingPageResult & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || 'Failed to publish landing page preview');
  }
  return data;
}

const HTML_FENCE_RE = /```html\s*([\s\S]*?)```/i;
const JSON_FENCE_RE = /```json\s*([\s\S]*?)```/i;

export function extractHtmlBlock(reply: string): string | null {
  const match = reply.match(HTML_FENCE_RE);
  if (!match) return null;
  const candidate = match[1].trim();
  return candidate.length > 0 ? candidate : null;
}

export function extractJsonBlock(reply: string): string | null {
  const match = reply.match(JSON_FENCE_RE);
  if (!match) return null;
  const candidate = match[1].trim();
  return candidate.length > 0 ? candidate : null;
}

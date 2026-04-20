/**
 * `gpt-image-1` only supports a fixed set of output sizes. We map the caller's
 * desired width/height to the closest supported size by aspect ratio.
 *
 * Reference: https://platform.openai.com/docs/api-reference/images
 */
export type SupportedSize = '1024x1024' | '1024x1536' | '1536x1024';

const SUPPORTED: { size: SupportedSize; w: number; h: number; ratio: number }[] = [
  { size: '1024x1024', w: 1024, h: 1024, ratio: 1 },
  { size: '1024x1536', w: 1024, h: 1536, ratio: 1024 / 1536 }, // ~0.667 (portrait)
  { size: '1536x1024', w: 1536, h: 1024, ratio: 1536 / 1024 }, // 1.5    (landscape)
];

export function pickClosestSize(width: number, height: number): SupportedSize {
  const safeW = Math.max(1, width);
  const safeH = Math.max(1, height);
  const target = safeW / safeH;
  let best = SUPPORTED[0];
  let bestDelta = Math.abs(Math.log(target / best.ratio));
  for (let i = 1; i < SUPPORTED.length; i += 1) {
    const cand = SUPPORTED[i];
    const delta = Math.abs(Math.log(target / cand.ratio));
    if (delta < bestDelta) {
      best = cand;
      bestDelta = delta;
    }
  }
  return best.size;
}

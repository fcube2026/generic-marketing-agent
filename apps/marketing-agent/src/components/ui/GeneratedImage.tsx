'use client';

import { useEffect, useMemo, useState } from 'react';

const BRAND_SUFFIX =
  ', curex24 healthcare brand, professional quality, clean composition, no watermark, no text overlay';

// Pollinations.ai is a free, no-key endpoint and can occasionally 5xx/timeout
// (especially with the flux model on first cold request). We retry a few times
// with a new seed, and fall back to the faster `turbo` model on later attempts.
const MAX_ATTEMPTS = 3;
const MODEL_BY_ATTEMPT = ['flux', 'flux', 'turbo'] as const;

function randomSeed() {
  return Math.floor(Math.random() * 1_000_000);
}

interface GeneratedImageProps {
  prompt: string;
  width?: number;
  height?: number;
  label?: string;
}

function buildSrc(opts: {
  prompt: string;
  width: number;
  height: number;
  seed: number;
  model: string;
}) {
  const { prompt, width, height, seed, model } = opts;
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    nologo: 'true',
    model,
    seed: String(seed),
    referrer: 'curex24',
  });
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
}

export function GeneratedImage({ prompt, width = 1024, height = 1024, label }: GeneratedImageProps) {
  const fullPrompt = useMemo(() => prompt + BRAND_SUFFIX, [prompt]);

  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [seed, setSeed] = useState(randomSeed);

  // Reset state when the prompt or dimensions change so a re-render fetches
  // a fresh image instead of showing a stale error.
  useEffect(() => {
    setStatus('loading');
    setAttempt(0);
    setSeed(randomSeed());
  }, [fullPrompt, width, height]);

  const model = MODEL_BY_ATTEMPT[Math.min(attempt, MODEL_BY_ATTEMPT.length - 1)];
  const src = buildSrc({ prompt: fullPrompt, width, height, seed, model });

  function retry() {
    setStatus('loading');
    setAttempt(0);
    setSeed(randomSeed());
  }

  function handleError() {
    if (attempt + 1 < MAX_ATTEMPTS) {
      // Auto-retry with a new seed (and possibly a different model).
      setStatus('loading');
      setAttempt((a) => a + 1);
      setSeed(randomSeed());
    } else {
      setStatus('error');
    }
  }

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
      {label && (
        <div className="px-3 py-2 border-b border-gray-200 bg-white">
          <p className="text-xs font-semibold text-gray-600">🖼️ {label}</p>
        </div>
      )}
      <div className="relative">
        {status !== 'loaded' && (
          <div
            className={`flex flex-col items-center justify-center gap-2 bg-gray-100 px-4 ${
              status === 'error' ? 'h-40' : 'h-52'
            }`}
          >
            {status === 'loading' ? (
              <>
                <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-gray-500">
                  Generating AI visual{attempt > 0 ? ` (retry ${attempt}/${MAX_ATTEMPTS - 1})` : ''}…
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-500 text-center">
                  ⚠️ Image generation failed after {MAX_ATTEMPTS} attempts. The free Pollinations.ai
                  endpoint may be busy.
                </p>
                <button
                  type="button"
                  onClick={retry}
                  className="text-xs px-3 py-1.5 bg-primary text-white rounded-full font-semibold hover:bg-primary-dark transition"
                >
                  🔄 Try again
                </button>
              </>
            )}
          </div>
        )}
        <img
          // Force <img> to remount on each attempt so the browser re-fetches.
          key={`${attempt}-${seed}`}
          src={src}
          alt={label ?? 'AI-generated marketing visual'}
          className={`w-full h-auto ${status === 'loaded' ? 'block' : 'hidden'}`}
          onLoad={() => setStatus('loaded')}
          onError={handleError}
        />
        {status === 'loaded' && (
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-2 right-2 text-xs px-2.5 py-1 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-white transition shadow-sm"
          >
            ⬇️ Download
          </a>
        )}
      </div>
    </div>
  );
}

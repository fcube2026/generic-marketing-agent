'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { describeAiError, generateImage } from '@/lib/services/aiService';
import { useImageProvider } from '@/lib/hooks/useImageProvider';

const BRAND_SUFFIX =
  ', curex24 healthcare brand, professional quality, clean composition, no watermark, no text overlay';

const MAX_ATTEMPTS = 3;

interface GeneratedImageProps {
  prompt: string;
  width?: number;
  height?: number;
  label?: string;
}

interface ImageData {
  src: string;
  size: string;
  model: string;
}

export function GeneratedImage({ prompt, width = 1024, height = 1024, label }: GeneratedImageProps) {
  const fullPrompt = useMemo(() => prompt + BRAND_SUFFIX, [prompt]);
  const [provider] = useImageProvider();

  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [image, setImage] = useState<ImageData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Token to discard stale responses if props change while a request is in flight.
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    let cancelled = false;

    setStatus('loading');
    setImage(null);
    setErrorMessage('');

    (async () => {
      try {
        const result = await generateImage({ prompt: fullPrompt, width, height, provider });
        if (cancelled || requestIdRef.current !== requestId) return;
        const src = result.dataUrl ?? result.url ?? '';
        if (!src) {
          setErrorMessage('Image provider returned no image');
          setStatus('error');
          return;
        }
        setImage({ src, size: result.size, model: result.model });
        setStatus('loaded');
      } catch (err) {
        if (cancelled || requestIdRef.current !== requestId) return;
        setErrorMessage(describeAiError(err, 'Image generation failed'));
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fullPrompt, width, height, attempt, provider]);

  function retry() {
    if (attempt + 1 < MAX_ATTEMPTS) {
      setAttempt((a) => a + 1);
    } else {
      // Reset back to attempt 0 so the user can try again from scratch.
      setAttempt(0);
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
              status === 'error' ? 'h-44' : 'h-52'
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
                  ⚠️ {errorMessage || 'Image generation failed.'}
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
        {image && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.src}
              alt={label ?? 'AI-generated marketing visual'}
              className={`w-full h-auto ${status === 'loaded' ? 'block' : 'hidden'}`}
            />
            {status === 'loaded' && (
              <a
                href={image.src}
                download={`curex24-${Date.now()}.png`}
                target="_blank"
                rel="noreferrer"
                className="absolute bottom-2 right-2 text-xs px-2.5 py-1 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-white transition shadow-sm"
              >
                ⬇️ Download
              </a>
            )}
          </>
        )}
      </div>
      {image && status === 'loaded' && (
        <div className="px-3 py-1.5 border-t border-gray-200 bg-white">
          <p className="text-[10px] text-gray-500 font-mono truncate" title={image.model}>
            model: {image.model}
          </p>
        </div>
      )}
    </div>
  );
}

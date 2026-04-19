'use client';

import { useState } from 'react';

const BRAND_SUFFIX =
  ', curex24 healthcare brand, professional quality, clean composition, no watermark, no text overlay';

interface GeneratedImageProps {
  prompt: string;
  width?: number;
  height?: number;
  label?: string;
}

export function GeneratedImage({ prompt, width = 1024, height = 1024, label }: GeneratedImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const fullPrompt = prompt + BRAND_SUFFIX;
  const src = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=${width}&height=${height}&nologo=true&model=flux`;

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
            className={`flex flex-col items-center justify-center gap-2 bg-gray-100 ${
              status === 'error' ? 'h-32' : 'h-52'
            }`}
          >
            {status === 'loading' ? (
              <>
                <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-gray-500">Generating AI visual…</p>
              </>
            ) : (
              <p className="text-xs text-gray-400 px-4 text-center">
                ⚠️ Image generation failed — try refreshing or use the Visual Generator in ✨ Create
                Studio.
              </p>
            )}
          </div>
        )}
        <img
          src={src}
          alt={label ?? 'AI-generated marketing visual'}
          className={`w-full h-auto ${status === 'loaded' ? 'block' : 'hidden'}`}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
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

'use client';

import {
  IMAGE_PROVIDER_LABELS,
  ImageProvider,
  useImageProvider,
} from '@/lib/hooks/useImageProvider';

const OPTIONS: ImageProvider[] = ['openai', 'google'];

interface ImageProviderToggleProps {
  /** Optional CSS class for the wrapper. */
  className?: string;
  /** Hide the "Image model" label (defaults to shown). */
  hideLabel?: boolean;
}

/**
 * Small segmented control that lets the user pick which AI provider should
 * generate images. The choice is persisted in `localStorage` and shared
 * across all mounted instances via {@link useImageProvider}.
 */
export function ImageProviderToggle({ className = '', hideLabel = false }: ImageProviderToggleProps) {
  const [provider, setProvider] = useImageProvider();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {!hideLabel && (
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Image model
        </span>
      )}
      <div
        role="radiogroup"
        aria-label="AI image provider"
        className="inline-flex rounded-full border border-gray-200 bg-white p-0.5 shadow-sm"
      >
        {OPTIONS.map((opt) => {
          const active = provider === opt;
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setProvider(opt)}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
                active
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-600 hover:text-primary'
              }`}
            >
              {IMAGE_PROVIDER_LABELS[opt]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

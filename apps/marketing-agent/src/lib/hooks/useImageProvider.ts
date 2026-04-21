'use client';

import { useEffect, useState } from 'react';

export type ImageProvider = 'openai' | 'google';

export const IMAGE_PROVIDER_STORAGE_KEY = 'marketing_image_provider';
export const IMAGE_PROVIDER_CHANGE_EVENT = 'marketing_image_provider:change';

export const IMAGE_PROVIDER_LABELS: Record<ImageProvider, string> = {
  openai: 'OpenAI · dall-e-3',
  google: 'Google · Nano Banana',
};

export const DEFAULT_IMAGE_PROVIDER: ImageProvider = 'openai';

function readStored(): ImageProvider {
  if (typeof window === 'undefined') return DEFAULT_IMAGE_PROVIDER;
  try {
    const v = window.localStorage.getItem(IMAGE_PROVIDER_STORAGE_KEY);
    if (v === 'openai' || v === 'google') return v;
  } catch {
    // ignore (Safari private mode, etc.)
  }
  return DEFAULT_IMAGE_PROVIDER;
}

function writeStored(value: ImageProvider) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(IMAGE_PROVIDER_STORAGE_KEY, value);
  } catch {
    // ignore
  }
  // Notify other hook instances in the same tab (the native `storage` event
  // only fires across tabs).
  window.dispatchEvent(
    new CustomEvent<ImageProvider>(IMAGE_PROVIDER_CHANGE_EVENT, { detail: value }),
  );
}

/**
 * React hook backed by `localStorage` (`marketing_image_provider`) that lets
 * any UI component read/write the user's preferred AI image provider. All
 * mounted instances stay in sync via a CustomEvent.
 */
export function useImageProvider(): [ImageProvider, (next: ImageProvider) => void] {
  const [provider, setProvider] = useState<ImageProvider>(DEFAULT_IMAGE_PROVIDER);

  // Hydrate from storage after mount (avoid SSR/CSR mismatch).
  useEffect(() => {
    setProvider(readStored());
  }, []);

  // Sync when other components / tabs change the value.
  useEffect(() => {
    function onLocal(e: Event) {
      const detail = (e as CustomEvent<ImageProvider>).detail;
      if (detail === 'openai' || detail === 'google') setProvider(detail);
    }
    function onStorage(e: StorageEvent) {
      if (e.key !== IMAGE_PROVIDER_STORAGE_KEY) return;
      if (e.newValue === 'openai' || e.newValue === 'google') setProvider(e.newValue);
    }
    window.addEventListener(IMAGE_PROVIDER_CHANGE_EVENT, onLocal);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(IMAGE_PROVIDER_CHANGE_EVENT, onLocal);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const update = (next: ImageProvider) => {
    setProvider(next);
    writeStored(next);
  };

  return [provider, update];
}

/**
 * Theme entry for @curex24/mobile.
 *
 * Re-exports the resolved token tree from @curex24/design-tokens and exposes
 * a `useTheme()` hook that follows the OS color scheme (overridable later via
 * a user preference store).
 */
import { useMemo } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import tokens from '@curex24/design-tokens';

export { tokens };
export type ThemeMode = 'light' | 'dark';

export interface Theme {
  mode: ThemeMode;
  /** Active palette — either themes.light or themes.dark from the tokens. */
  colors: typeof tokens.themes.light.color;
  /** Token shortcuts that don't change between themes. */
  spacing: typeof tokens.core.spacing;
  radius: typeof tokens.core.radius;
  font: typeof tokens.core.font;
  shadow: typeof tokens.core.shadow;
}

function buildTheme(mode: ThemeMode): Theme {
  return {
    mode,
    colors: (mode === 'dark' ? tokens.themes.dark : tokens.themes.light).color,
    spacing: tokens.core.spacing,
    radius: tokens.core.radius,
    font: tokens.core.font,
    shadow: tokens.core.shadow,
  };
}

/** Hook variant — re-renders when the OS color scheme changes. */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  const mode: ThemeMode = scheme === 'dark' ? 'dark' : 'light';
  return useMemo(() => buildTheme(mode), [mode]);
}

/** Imperative variant for places that can't use hooks (e.g. StyleSheet at module load). */
export function getTheme(): Theme {
  const scheme = Appearance.getColorScheme();
  const mode: ThemeMode = scheme === 'dark' ? 'dark' : 'light';
  return buildTheme(mode);
}

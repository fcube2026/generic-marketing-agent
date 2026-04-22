import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { tokens, useTheme } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const px = (v: string) => parseInt(v, 10);

const SIZE_MAP: Record<ButtonSize, { paddingV: number; paddingH: number; fontSize: number; minHeight: number }> = {
  sm: { paddingV: px(tokens.core.spacing['2']), paddingH: px(tokens.core.spacing['3']), fontSize: px(tokens.core.font.size.sm), minHeight: 32 },
  md: { paddingV: px(tokens.core.spacing['3']), paddingH: px(tokens.core.spacing['5']), fontSize: px(tokens.core.font.size.md), minHeight: 44 },
  lg: { paddingV: px(tokens.core.spacing['4']), paddingH: px(tokens.core.spacing['6']), fontSize: px(tokens.core.font.size.lg), minHeight: 52 },
};

/**
 * Token-driven Button.
 *
 * Every color / spacing / radius / font value is read from
 * @curex24/design-tokens via the `useTheme()` hook — no inline hex, no magic
 * numbers. This component is the reference implementation for the mobile UI
 * library described in `packages/design-tokens/README.md`.
 */
export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  iconLeft,
  iconRight,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const sz = SIZE_MAP[size];

  const palette = (() => {
    switch (variant) {
      case 'secondary':
        return {
          bg: theme.colors.surface.raised,
          bgPressed: theme.colors.surface.sunken,
          fg: theme.colors.text.primary,
          border: theme.colors.border.strong,
        };
      case 'ghost':
        return {
          bg: 'transparent',
          bgPressed: theme.colors.surface.sunken,
          fg: theme.colors.action.primary,
          border: 'transparent',
        };
      case 'destructive':
        return {
          bg: theme.colors.action.danger,
          bgPressed: theme.colors.action.danger,
          fg: theme.colors.text.inverse,
          border: theme.colors.action.danger,
        };
      case 'primary':
      default:
        return {
          bg: theme.colors.action.primary,
          bgPressed: theme.colors.action.primaryActive,
          fg: theme.colors.text.inverse,
          border: theme.colors.action.primary,
        };
    }
  })();

  const isInteractiveDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isInteractiveDisabled, busy: loading }}
      disabled={isInteractiveDisabled}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed && !isInteractiveDisabled ? palette.bgPressed : palette.bg,
          borderColor: palette.border,
          borderRadius: px(tokens.core.radius.md),
          paddingVertical: sz.paddingV,
          paddingHorizontal: sz.paddingH,
          minHeight: sz.minHeight,
          opacity: isInteractiveDisabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.row}>
          {iconLeft ? <View style={styles.iconLeft}>{iconLeft}</View> : null}
          <Text
            style={[
              styles.label,
              {
                color: palette.fg,
                fontSize: sz.fontSize,
                fontFamily: tokens.core.font.family.sans,
                fontWeight: tokens.core.font.weight.semibold as '600',
              },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {iconRight ? <View style={styles.iconRight}>{iconRight}</View> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: px(tokens.core.spacing['2']),
  },
  iconRight: {
    marginLeft: px(tokens.core.spacing['2']),
  },
});

export default Button;

'use client';

import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  className?: string;
}

const SIZE_STYLES: Record<ButtonSize, React.CSSProperties> = {
  sm: {
    paddingTop:    'var(--curex-core-spacing-2)',
    paddingBottom: 'var(--curex-core-spacing-2)',
    paddingLeft:   'var(--curex-core-spacing-3)',
    paddingRight:  'var(--curex-core-spacing-3)',
    fontSize:      'var(--curex-core-font-size-sm)',
    minHeight:     32,
  },
  md: {
    paddingTop:    'var(--curex-core-spacing-3)',
    paddingBottom: 'var(--curex-core-spacing-3)',
    paddingLeft:   'var(--curex-core-spacing-5)',
    paddingRight:  'var(--curex-core-spacing-5)',
    fontSize:      'var(--curex-core-font-size-md)',
    minHeight:     44,
  },
  lg: {
    paddingTop:    'var(--curex-core-spacing-4)',
    paddingBottom: 'var(--curex-core-spacing-4)',
    paddingLeft:   'var(--curex-core-spacing-6)',
    paddingRight:  'var(--curex-core-spacing-6)',
    fontSize:      'var(--curex-core-font-size-lg)',
    minHeight:     52,
  },
};

const VARIANT_STYLES: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--curex-semantic-color-action-primary)',
    color: 'var(--curex-semantic-color-text-inverse)',
    borderColor: 'var(--curex-semantic-color-action-primary)',
  },
  secondary: {
    backgroundColor: 'var(--curex-semantic-color-surface-raised)',
    color: 'var(--curex-semantic-color-text-primary)',
    borderColor: 'var(--curex-semantic-color-border-strong)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'var(--curex-semantic-color-action-primary)',
    borderColor: 'transparent',
  },
  destructive: {
    backgroundColor: 'var(--curex-semantic-color-action-danger)',
    color: 'var(--curex-semantic-color-text-inverse)',
    borderColor: 'var(--curex-semantic-color-action-danger)',
  },
};

/**
 * Token-driven Button for the admin Next.js app.
 *
 * All visual values are pulled from the `--curex-*` CSS variables produced by
 * `@curex24/design-tokens` (imported in `globals.css`). Do not introduce raw
 * hex or px values — extend the tokens instead.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  fullWidth = false,
  iconLeft,
  iconRight,
  type = 'button',
  className,
  children,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--curex-core-spacing-2)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderRadius: 'var(--curex-components-button-primary-radius)',
        fontFamily: 'var(--curex-core-font-family-sans)',
        fontWeight: 600,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
        width: fullWidth ? '100%' : undefined,
        transition: 'background-color 120ms ease, border-color 120ms ease, color 120ms ease',
        ...SIZE_STYLES[size],
        ...VARIANT_STYLES[variant],
        ...style,
      }}
      {...rest}
    >
      {loading ? <Spinner /> : iconLeft}
      <span>{children}</span>
      {!loading && iconRight}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: '1em',
        height: '1em',
        borderRadius: '9999px',
        border: '2px solid currentColor',
        borderTopColor: 'transparent',
        animation: 'curex-spin 0.7s linear infinite',
      }}
    />
  );
}

export default Button;

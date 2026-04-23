/**
 * Helpers for masking sensitive PII in log lines.
 *
 * These helpers are intended for log output ONLY. Never apply them to data
 * that is persisted to the database or returned in API responses.
 */

/**
 * Mask a phone number for log output. Preserves a leading `+` (if any) and
 * the last 3 digits; all other digits are replaced with `*`. Non-digit
 * characters (spaces, dashes, parentheses) are stripped from the middle.
 *
 * Examples:
 *   maskPhone('+919876543210')   => '+*******210'
 *   maskPhone('9876543210')      => '*******210'
 *   maskPhone('+1 555 123 4567') => '+*******567'
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) {
    return '';
  }

  const trimmed = String(phone).trim();
  if (trimmed.length === 0) {
    return '';
  }

  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (digits.length === 0) {
    return hasPlus ? '+' : '';
  }

  if (digits.length <= 3) {
    return `${hasPlus ? '+' : ''}${'*'.repeat(digits.length)}`;
  }

  const lastThree = digits.slice(-3);
  const maskedCount = digits.length - 3;
  return `${hasPlus ? '+' : ''}${'*'.repeat(maskedCount)}${lastThree}`;
}

/**
 * Mask a free-form address string for log output. Returns just enough
 * information (length & first character) for diagnostics without exposing
 * the actual address contents.
 */
export function maskAddress(address: string | null | undefined): string {
  if (!address) {
    return '';
  }

  const trimmed = String(address).trim();
  if (trimmed.length === 0) {
    return '';
  }

  const head = trimmed.charAt(0);
  return `${head}***(len=${trimmed.length})`;
}

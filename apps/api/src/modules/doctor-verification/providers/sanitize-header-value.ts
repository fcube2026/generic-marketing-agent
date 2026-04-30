/**
 * Strip characters that would make a string invalid as an HTTP header value.
 *
 * The undici fetch implementation (Node 18+) rejects header values containing
 * CR, LF, NUL, or any other control character with
 * `Headers.append: "..." is an invalid header value`. When operators paste
 * tokens into env-var UIs (Railway, Vercel, etc.) a trailing newline or stray
 * whitespace is extremely easy to introduce and very hard to spot. Trimming
 * + stripping control chars defensively avoids breaking outbound HTTPS calls
 * because of a copy-paste mistake while still preserving the original token
 * payload (JWTs / API keys are base64url, so no legitimate control characters
 * can appear inside them).
 */
export function sanitizeHeaderValue(
  value: string | undefined,
): string | undefined {
  if (value === undefined || value === null) return value;
  // Remove any character with code <= 0x1F (control chars incl. CR/LF/TAB)
  // or 0x7F (DEL), then trim surrounding whitespace.
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001F\u007F]/g, '').trim();
}

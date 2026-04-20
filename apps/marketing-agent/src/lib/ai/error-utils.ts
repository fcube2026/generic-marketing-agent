/**
 * Shared helpers for the `/api/ai/*` route handlers.
 */

/**
 * Best-effort extraction of an HTTP status code from an unknown error thrown
 * by the OpenAI SDK (or any other fetch-based client). Returns `500` when no
 * numeric `status` field is present.
 */
export function getErrorStatus(err: unknown): number {
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const s = (err as { status: unknown }).status;
    if (typeof s === 'number') return s;
  }
  return 500;
}

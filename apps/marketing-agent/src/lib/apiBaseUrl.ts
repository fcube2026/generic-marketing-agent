const normalize = (u: string) => u.replace(/\/+$/, "");

/**
 * API base URL resolution order:
 * 1) NEXT_PUBLIC_API_URL (recommended)
 * 2) If running in browser and same-origin proxy is set up: "" (optional)
 * 3) Fallback: http://localhost:3000/api/v1 (dev)
 */
export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;

  if (envUrl && envUrl.trim().length > 0) {
    return normalize(envUrl.trim());
  }

  // Safe fallback for local dev
  return "http://localhost:3000/api/v1";
}
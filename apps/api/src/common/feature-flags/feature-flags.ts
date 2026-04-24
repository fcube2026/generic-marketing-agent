/**
 * Centralized feature flag accessors. Defaults are SAFE — new flows are
 * disabled by default, and operators must explicitly enable them via env.
 *
 * Set `ENABLE_PRESCRIPTION_FLOW=true` in the deployment environment
 * (Railway / .env) to enable the prescription approval + payment endpoints.
 */
const TRUTHY = new Set(['true', '1', 'yes', 'on']);

function readBooleanFlag(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === '') {
    return defaultValue;
  }
  return TRUTHY.has(String(raw).trim().toLowerCase());
}

export const FeatureFlags = {
  /** Prescription-only order + admin approval + post-approval payment flow. */
  isPrescriptionFlowEnabled(): boolean {
    return readBooleanFlag('ENABLE_PRESCRIPTION_FLOW', false);
  },
};

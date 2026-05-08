/**
 * Tenant / workspace model.
 *
 * Every read and write through the agent runtime is scoped by a `TenantContext`.
 * Single-tenant deployments use `DEFAULT_TENANT` and never touch any of this
 * machinery; multi-tenant deployments derive the context from the request's
 * auth principal at the route boundary.
 *
 * The shape is deliberately small so adapters (SQL, document, REST) can map
 * it onto any storage model.
 */

export interface Tenant {
  /** Stable, URL-safe identifier (e.g. "acme-finance", "default"). */
  id: string;
  /** Human label shown in the UI. */
  name: string;
  /** ID of the active domain pack (e.g. "fcube-finance", "ecommerce"). */
  domainPackId: string;
  /** BCP-47 locale tag, e.g. "en-IN". Defaults to "en". */
  locale?: string;
  /** ISO-4217 currency code, e.g. "INR". Defaults to "USD". */
  currency?: string;
  /** IANA timezone, e.g. "Asia/Kolkata". Defaults to "UTC". */
  timezone?: string;
  /** Free-form branding (logo URL, primary color, …). */
  branding?: Record<string, string>;
  /** Versioned feature flags. */
  features?: Record<string, boolean>;
}

/**
 * Per-request context. Adapters use `tenant.id` as the partition key.
 *
 * `principal` is set by the `AuthAdapter` (or left undefined for anonymous
 * requests in zero-config dev mode).
 */
export interface TenantContext {
  tenant: Tenant;
  principal?: {
    sub: string;
    role?: string;
    email?: string;
    [k: string]: unknown;
  };
}

/**
 * Default single-tenant for zero-config local dev. Keeps the existing
 * marketing-agent UX identical when no `agent.config.ts` is present.
 */
export const DEFAULT_TENANT: Tenant = {
  id: 'default',
  name: 'Default workspace',
  domainPackId: 'fcube-finance',
  locale: 'en',
  currency: 'USD',
  timezone: 'UTC',
};

export const DEFAULT_TENANT_CONTEXT: TenantContext = {
  tenant: DEFAULT_TENANT,
};

/**
 * Injection token for the pharmacy providers map.
 *
 * Extracted to its own file to avoid circular-import issues between
 * PharmacyModule and PharmacyJobModule.
 */
export const PHARMACY_PROVIDERS_MAP = 'PHARMACY_PROVIDERS_MAP';

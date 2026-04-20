/**
 * Queue names and job identifiers for pharmacy background processing.
 */

/** Queue for polling order status from the mock pharmacy provider. */
export const PHARMACY_ORDER_STATUS_QUEUE = 'pharmacy-order-status';

/** Queue for scheduling refill reminder notifications. */
export const PHARMACY_REFILL_REMINDER_QUEUE = 'pharmacy-refill-reminder';

/** Job names within each queue. */
export const PHARMACY_JOB_NAMES = {
  POLL_ORDER_STATUSES: 'poll-order-statuses',
  REFILL_REMINDER: 'refill-reminder',
  REFILL_REMINDER_FOLLOWUP: 'refill-reminder-followup',
} as const;

/** Default configuration values. */
export const PHARMACY_JOB_DEFAULTS = {
  /** Default polling interval in milliseconds (5 minutes). */
  STATUS_POLL_INTERVAL_MS: 300_000,
  /** Default number of days before refill date to send the first reminder. */
  REFILL_REMINDER_DAYS_BEFORE: 3,
  /** Default prescription duration in days (used when not specified). */
  DEFAULT_PRESCRIPTION_DURATION_DAYS: 30,
} as const;

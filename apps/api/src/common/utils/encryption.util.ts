import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import { Logger } from '@nestjs/common';

/**
 * Application-level PII encryption utility.
 *
 * Algorithm: AES-256-CBC with a random 16-byte IV per encryption.
 * Key:       Derived (SHA-256) from the `PII_ENCRYPTION_KEY` environment
 *            variable so callers may provide either a high-entropy key or a
 *            simple passphrase.
 *
 * Wire format of an encrypted value:
 *
 *   enc:v1:<base64(iv)>:<base64(ciphertext)>
 *
 * The `enc:v1:` prefix is a stable marker that:
 *  - lets {@link decrypt} round-trip plain (legacy, pre-encryption) values
 *    without throwing, and
 *  - allows {@link isEncrypted} to detect ciphertext when migrating data.
 *
 * Behaviour when the env var is missing or invalid:
 *  - Logs a single warning per process.
 *  - {@link encrypt} returns the input unchanged (DEV ONLY fallback).
 *  - {@link decrypt} also returns the input unchanged (since nothing was
 *    encrypted in the first place).
 *
 * This utility intentionally has NO side-effects on the database schema or
 * API contracts; it operates purely on string values inside the service
 * layer.
 */

const ENC_PREFIX = 'enc:v1:';
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';

const logger = new Logger('EncryptionUtil');
let warnedMissingKey = false;

/** Resolve and cache the 32-byte AES key derived from the configured secret. */
function getKey(): Buffer | null {
  const secret = process.env.PII_ENCRYPTION_KEY;
  if (!secret || secret.trim().length === 0) {
    if (!warnedMissingKey) {
      logger.warn(
        'PII_ENCRYPTION_KEY is not configured. PII fields will be stored in plain text (DEV ONLY).',
      );
      warnedMissingKey = true;
    }
    return null;
  }

  // Derive a stable 32-byte key from the configured secret. Using SHA-256
  // means callers can supply either a hex/base64 key OR a passphrase.
  return createHash('sha256').update(secret, 'utf8').digest();
}

/**
 * Returns true when `value` looks like a value previously produced by
 * {@link encrypt}.
 */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX);
}

/**
 * Encrypt a plain-text PII value.
 *
 * - If the value is null / undefined / empty, it is returned unchanged.
 * - If the value is already encrypted (carries the `enc:v1:` marker), it is
 *   returned unchanged so callers can safely re-encrypt round-tripped data.
 * - If `PII_ENCRYPTION_KEY` is not configured, the value is returned in
 *   plain text and a warning is logged once.
 */
export function encrypt(
  text: string | null | undefined,
): string | null | undefined {
  if (text === null || text === undefined) {
    return text;
  }
  if (typeof text !== 'string' || text.length === 0) {
    return text;
  }
  if (isEncrypted(text)) {
    return text;
  }

  const key = getKey();
  if (!key) {
    return text;
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);

  return `${ENC_PREFIX}${iv.toString('base64')}:${ciphertext.toString('base64')}`;
}

/**
 * Decrypt a value previously produced by {@link encrypt}.
 *
 * - If the value is null / undefined / empty, it is returned unchanged.
 * - If the value is NOT encrypted (no `enc:v1:` marker), it is returned
 *   unchanged. This makes the helper safe to apply to legacy plain-text
 *   rows that were saved before encryption was enabled.
 * - If decryption fails (e.g. key rotated), a warning is logged and the
 *   raw stored value is returned so the caller can degrade gracefully
 *   instead of breaking the API response.
 */
export function decrypt(
  text: string | null | undefined,
): string | null | undefined {
  if (text === null || text === undefined) {
    return text;
  }
  if (typeof text !== 'string' || text.length === 0) {
    return text;
  }
  if (!isEncrypted(text)) {
    return text;
  }

  const key = getKey();
  if (!key) {
    // Should not normally happen — value is encrypted but we have no key.
    return text;
  }

  try {
    const body = text.slice(ENC_PREFIX.length);
    const sep = body.indexOf(':');
    if (sep < 0) {
      return text;
    }
    const iv = Buffer.from(body.slice(0, sep), 'base64');
    const ciphertext = Buffer.from(body.slice(sep + 1), 'base64');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    const plain = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return plain.toString('utf8');
  } catch (err) {
    logger.warn(
      `Failed to decrypt PII value: ${(err as Error).message}. Returning stored value as-is.`,
    );
    return text;
  }
}

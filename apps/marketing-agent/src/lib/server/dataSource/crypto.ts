/**
 * AES-256-GCM helpers used to encrypt the user-supplied database connection
 * string before persisting it to disk. The key is derived from the
 * `MARKETING_AGENT_SECRET` env var via scrypt; if unset, a process-stable
 * fallback key is used so the server still functions in dev (a warning is
 * emitted exactly once).
 *
 * The encrypted blob layout is `<iv:12>.<tag:16>.<ciphertext>` — all base64
 * url-safe — so it can be stored as a single string field.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGO = 'aes-256-gcm';
const KEY_LEN = 32;
const IV_LEN = 12;
const TAG_LEN = 16;
const SALT = 'marketing-agent::dsn-v1';

let warned = false;
let cachedKey: Buffer | null = null;
let cachedKeySource: string | null = null;

function deriveKey(): Buffer {
  const secret = process.env.MARKETING_AGENT_SECRET;
  const source = secret && secret.length > 0 ? secret : '__marketing-agent-insecure-default__';
  if (!secret && !warned) {
    // eslint-disable-next-line no-console
    console.warn(
      '[marketing-agent] MARKETING_AGENT_SECRET is not set. Falling back to an insecure default key. Set this env var in production.',
    );
    warned = true;
  }
  if (cachedKey && cachedKeySource === source) return cachedKey;
  cachedKey = scryptSync(source, SALT, KEY_LEN);
  cachedKeySource = source;
  return cachedKey;
}

const b64 = (b: Buffer) =>
  b.toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const fromB64 = (s: string) => {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
};

export function encryptSecret(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${b64(iv)}.${b64(tag)}.${b64(ct)}`;
}

export function decryptSecret(blob: string): string {
  const parts = blob.split('.');
  if (parts.length !== 3) throw new Error('Malformed encrypted blob');
  const iv = fromB64(parts[0]);
  const tag = fromB64(parts[1]);
  const ct = fromB64(parts[2]);
  if (iv.length !== IV_LEN) throw new Error('Bad IV length');
  if (tag.length !== TAG_LEN) throw new Error('Bad tag length');
  const key = deriveKey();
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

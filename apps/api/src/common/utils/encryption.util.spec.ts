import { encrypt, decrypt, isEncrypted } from './encryption.util';

describe('encryption.util', () => {
  const ORIGINAL_KEY = process.env.PII_ENCRYPTION_KEY;

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) {
      delete process.env.PII_ENCRYPTION_KEY;
    } else {
      process.env.PII_ENCRYPTION_KEY = ORIGINAL_KEY;
    }
  });

  describe('with PII_ENCRYPTION_KEY configured', () => {
    beforeEach(() => {
      process.env.PII_ENCRYPTION_KEY = 'test-pii-key-for-unit-tests-please';
    });

    it('round-trips an arbitrary plain-text value', () => {
      const plain = '221B Baker Street, London';
      const cipher = encrypt(plain);

      expect(cipher).not.toEqual(plain);
      expect(isEncrypted(cipher)).toBe(true);
      expect(decrypt(cipher)).toEqual(plain);
    });

    it('produces a different ciphertext on each call (random IV)', () => {
      const plain = 'Some sensitive value';
      const a = encrypt(plain);
      const b = encrypt(plain);

      expect(a).not.toEqual(b);
      expect(decrypt(a)).toEqual(plain);
      expect(decrypt(b)).toEqual(plain);
    });

    it('is idempotent — encrypting an already-encrypted value is a no-op', () => {
      const cipher = encrypt('Hello world');
      expect(encrypt(cipher)).toEqual(cipher);
    });

    it('decrypt() returns plain values unchanged (legacy / unencrypted rows)', () => {
      expect(decrypt('plain text address')).toEqual('plain text address');
    });

    it('handles empty / null inputs without throwing', () => {
      expect(encrypt('')).toEqual('');
      expect(decrypt('')).toEqual('');
      expect(encrypt(null as any)).toBeNull();
      expect(decrypt(undefined as any)).toBeUndefined();
    });
  });

  describe('without PII_ENCRYPTION_KEY (DEV fallback)', () => {
    beforeEach(() => {
      delete process.env.PII_ENCRYPTION_KEY;
    });

    it('falls back to plain-text storage', () => {
      const plain = 'Some address';
      const out = encrypt(plain);
      expect(out).toEqual(plain);
      expect(isEncrypted(out)).toBe(false);
      expect(decrypt(out)).toEqual(plain);
    });
  });
});

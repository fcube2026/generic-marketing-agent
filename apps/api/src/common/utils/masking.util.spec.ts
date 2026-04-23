import { maskPhone, maskAddress } from './masking.util';

describe('masking.util', () => {
  describe('maskPhone', () => {
    it('masks all but the last 3 digits and preserves leading +', () => {
      expect(maskPhone('+919876543210')).toBe('+*********210');
    });

    it('handles plain 10-digit phones (no country code)', () => {
      expect(maskPhone('9876543210')).toBe('*******210');
    });

    it('strips spaces and other separators when computing digits', () => {
      expect(maskPhone('+1 555 123 4567')).toBe('+********567');
    });

    it('returns empty string for null / undefined / empty', () => {
      expect(maskPhone(null)).toBe('');
      expect(maskPhone(undefined)).toBe('');
      expect(maskPhone('')).toBe('');
    });

    it('does not blow up on very short inputs', () => {
      expect(maskPhone('12')).toBe('**');
    });

    it('never reveals the original number in the masked output', () => {
      const original = '+919876543210';
      const masked = maskPhone(original);
      expect(masked).not.toContain('987');
      expect(masked).not.toContain('654');
    });
  });

  describe('maskAddress', () => {
    it('returns just the first character + length for non-empty input', () => {
      expect(maskAddress('221B Baker Street')).toBe('2***(len=17)');
    });

    it('returns empty string for null / undefined / empty', () => {
      expect(maskAddress(null)).toBe('');
      expect(maskAddress(undefined)).toBe('');
      expect(maskAddress('   ')).toBe('');
    });

    it('does not include any of the original address content beyond the first character', () => {
      const masked = maskAddress('221B Baker Street, London');
      expect(masked).not.toContain('Baker');
      expect(masked).not.toContain('London');
    });
  });
});

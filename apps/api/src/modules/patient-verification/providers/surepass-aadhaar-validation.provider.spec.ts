import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SurepassAadhaarValidationProvider } from './surepass-aadhaar-validation.provider';

function buildProvider(
  env: Record<string, string> = {},
): SurepassAadhaarValidationProvider {
  const defaults: Record<string, string> = {
    SUREPASS_AADHAAR_VALIDATION_ENABLED: 'true',
    SUREPASS_API_URL: 'https://sandbox.surepass.io',
    SUREPASS_API_TOKEN: 'test-token',
    ...env,
  };
  const cfg = {
    get: <T>(key: string, def?: T) =>
      defaults[key] !== undefined
        ? (defaults[key] as unknown as T)
        : (def as T),
  } as unknown as ConfigService;
  return new SurepassAadhaarValidationProvider(cfg);
}

const AADHAAR = '591882112132';

const SUCCESS_BODY = JSON.stringify({
  success: true,
  status_code: 200,
  message_code: 'success',
  data: {
    aadhaar_number: 'XXXX XXXX 2132',
    age_range: '20-30',
    state: 'Maharashtra',
    gender: 'M',
    is_mobile: true,
  },
});

/** Returns a fresh Response on every call to avoid "Body already read" errors. */
function makeResponseFactory(body: string, status: number) {
  return () => Promise.resolve(new Response(body, { status }));
}

describe('SurepassAadhaarValidationProvider', () => {
  const fetchSpy = jest.spyOn(globalThis, 'fetch');

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    fetchSpy.mockReset();
    jest.useRealTimers();
  });

  describe('mock mode (disabled)', () => {
    it('returns a stub result without calling fetch', async () => {
      const provider = buildProvider({
        SUREPASS_AADHAAR_VALIDATION_ENABLED: 'false',
      });
      const result = await provider.validateAadhaar(AADHAAR);
      expect(result.valid).toBe(true);
      expect(result.lastDigits).toBe('2132');
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('live mode — success path', () => {
    it('parses a successful Surepass response', async () => {
      fetchSpy.mockImplementation(makeResponseFactory(SUCCESS_BODY, 200));
      const provider = buildProvider();
      const result = await provider.validateAadhaar(AADHAAR);
      expect(result.valid).toBe(true);
      expect(result.lastDigits).toBe('2132');
      expect(result.state).toBe('Maharashtra');
      expect(result.gender).toBe('M');
      expect(result.ageRange).toBe('20-30');
      expect(result.isMobile).toBe(true);
    });
  });

  describe('live mode — invalid Aadhaar (HTTP 422)', () => {
    it('returns valid:false without throwing', async () => {
      fetchSpy.mockImplementation(
        makeResponseFactory(JSON.stringify({ message: 'Id not found' }), 422),
      );
      const provider = buildProvider();
      const result = await provider.validateAadhaar(AADHAAR);
      expect(result.valid).toBe(false);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('live mode — retry on network error', () => {
    it('retries twice then throws ServiceUnavailableException', async () => {
      fetchSpy.mockRejectedValue(new TypeError('fetch failed'));
      const provider = buildProvider();
      // Attach the rejection handler immediately so it is never "unhandled".
      const assertion = expect(
        provider.validateAadhaar(AADHAAR),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      await jest.runAllTimersAsync();
      await assertion;
      // 3 total attempts (1 initial + 2 retries)
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('succeeds on the second attempt after a network error', async () => {
      fetchSpy
        .mockRejectedValueOnce(new TypeError('fetch failed'))
        .mockImplementationOnce(makeResponseFactory(SUCCESS_BODY, 200));
      const provider = buildProvider();
      const promise = provider.validateAadhaar(AADHAAR);
      await jest.runAllTimersAsync();
      const result = await promise;
      expect(result.valid).toBe(true);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('live mode — retry on HTTP 5xx', () => {
    it('retries on 500 and eventually throws ServiceUnavailableException', async () => {
      fetchSpy.mockImplementation(
        makeResponseFactory('Internal Server Error', 500),
      );
      const provider = buildProvider();
      const assertion = expect(
        provider.validateAadhaar(AADHAAR),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      await jest.runAllTimersAsync();
      await assertion;
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('succeeds on the third attempt after two 503 responses', async () => {
      fetchSpy
        .mockImplementationOnce(makeResponseFactory('Service Unavailable', 503))
        .mockImplementationOnce(makeResponseFactory('Service Unavailable', 503))
        .mockImplementationOnce(makeResponseFactory(SUCCESS_BODY, 200));
      const provider = buildProvider();
      const promise = provider.validateAadhaar(AADHAAR);
      await jest.runAllTimersAsync();
      const result = await promise;
      expect(result.valid).toBe(true);
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('live mode — deterministic 4xx errors (no retry)', () => {
    it('throws immediately on 401 without retrying', async () => {
      fetchSpy.mockImplementation(makeResponseFactory('Unauthorized', 401));
      const provider = buildProvider();
      await expect(provider.validateAadhaar(AADHAAR)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('throws immediately on 429 without retrying', async () => {
      fetchSpy.mockImplementation(
        makeResponseFactory('Too Many Requests', 429),
      );
      const provider = buildProvider();
      await expect(provider.validateAadhaar(AADHAAR)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('live mode — body status_code >= 500', () => {
    it('throws ServiceUnavailableException when body contains status_code 503', async () => {
      const body = JSON.stringify({
        success: false,
        status_code: 503,
        message: 'UIDAI temporarily unavailable',
      });
      fetchSpy.mockImplementation(makeResponseFactory(body, 200));
      const provider = buildProvider();
      await expect(provider.validateAadhaar(AADHAAR)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe('live mode — fallback to mock on failure', () => {
    it('returns the mock result when network errors persist and fallback is enabled', async () => {
      fetchSpy.mockRejectedValue(new TypeError('fetch failed'));
      const provider = buildProvider({
        SUREPASS_AADHAAR_VALIDATION_FALLBACK_TO_MOCK: 'true',
      });
      const promise = provider.validateAadhaar(AADHAAR);
      await jest.runAllTimersAsync();
      const result = await promise;
      // 3 total live attempts, then fallback to mock (no extra fetch).
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(result.valid).toBe(true);
      expect(result.lastDigits).toBe('2132');
      expect(result.rawResponse).toMatchObject({ source: 'mock' });
    });

    it('returns the mock result on a 401 when fallback is enabled (no retry)', async () => {
      fetchSpy.mockImplementation(makeResponseFactory('Unauthorized', 401));
      const provider = buildProvider({
        SUREPASS_AADHAAR_VALIDATION_FALLBACK_TO_MOCK: 'true',
      });
      const result = await provider.validateAadhaar(AADHAAR);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.valid).toBe(true);
      expect(result.rawResponse).toMatchObject({ source: 'mock' });
    });

    it('still returns a real invalid:false on 422 (does not fall back)', async () => {
      fetchSpy.mockImplementation(
        makeResponseFactory(JSON.stringify({ message: 'Id not found' }), 422),
      );
      const provider = buildProvider({
        SUREPASS_AADHAAR_VALIDATION_FALLBACK_TO_MOCK: 'true',
      });
      const result = await provider.validateAadhaar(AADHAAR);
      expect(result.valid).toBe(false);
    });
  });
});

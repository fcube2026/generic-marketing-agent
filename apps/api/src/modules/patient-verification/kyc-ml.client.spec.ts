import { KycMlClient, KycMlError, mapKycMlErrorStatus } from './kyc-ml.client';
import { ConfigService } from '@nestjs/config';
import { HttpStatus, ServiceUnavailableException } from '@nestjs/common';

/**
 * Builds a KycMlClient with a stubbed ConfigService so each test can switch
 * the relevant env values without touching `process.env`.
 */
function buildClient(env: Record<string, string>): KycMlClient {
  const cfg = {
    get: <T>(key: string, def?: T) =>
      env[key] !== undefined ? (env[key] as unknown as T) : (def as T),
  } as unknown as ConfigService;
  return new KycMlClient(cfg);
}

const baseEnv = {
  KYC_ML_ENABLED: 'true',
  KYC_ML_BASE_URL: 'http://kyc-ml:8001',
  KYC_ML_SHARED_SECRET: 'unit-test-secret',
  KYC_ML_TIMEOUT_MS: '5000',
};

describe('KycMlClient', () => {
  const fetchSpy = jest.spyOn(globalThis, 'fetch');

  afterEach(() => {
    fetchSpy.mockReset();
  });

  describe('isEnabled', () => {
    it('is disabled when feature flag is false', () => {
      const c = buildClient({ ...baseEnv, KYC_ML_ENABLED: 'false' });
      expect(c.isEnabled()).toBe(false);
    });

    it('is disabled when base URL is missing', () => {
      const c = buildClient({ ...baseEnv, KYC_ML_BASE_URL: '' });
      expect(c.isEnabled()).toBe(false);
    });

    it('is disabled when shared secret is missing', () => {
      const c = buildClient({ ...baseEnv, KYC_ML_SHARED_SECRET: '' });
      expect(c.isEnabled()).toBe(false);
    });

    it('is enabled when all three are set', () => {
      const c = buildClient(baseEnv);
      expect(c.isEnabled()).toBe(true);
    });
  });

  describe('processAadhaar', () => {
    it('signs the request, posts multipart/form-data and returns the body', async () => {
      const c = buildClient(baseEnv);
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            full_name: 'Ramesh Kumar',
            dob: '1990-05-12',
            gender: 'MALE',
            address: '42 MG Road',
            aadhaar_last4: '9012',
            face_stored: true,
            storage_path: 'user-1.jpg',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const out = await c.processAadhaar({
        userId: 'user-1',
        fileBuffer: Buffer.from('fake-image-bytes'),
        mimeType: 'image/jpeg',
      });

      expect(out.aadhaar_last4).toBe('9012');
      const [url, init] = fetchSpy.mock.calls[0]!;
      expect(url).toBe('http://kyc-ml:8001/process-aadhaar');
      const headers = init!.headers as Record<string, string>;
      expect(headers['X-User-Id']).toBe('user-1');
      // Hex-encoded SHA-256 = 64 chars
      expect(headers['X-Internal-Token']).toMatch(/^[a-f0-9]{64}$/);
      expect(headers['X-Internal-Timestamp']).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      // The signature must NOT include the secret literally.
      expect(headers['X-Internal-Token']).not.toContain('unit-test-secret');
      expect(init!.body).toBeInstanceOf(FormData);
    });

    it('maps a 4xx with structured body to KycMlError', async () => {
      const c = buildClient(baseEnv);
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 'NO_FACE_AADHAAR',
            message: 'Could not detect a face',
          }),
          { status: 409 },
        ),
      );

      await expect(
        c.processAadhaar({
          userId: 'u',
          fileBuffer: Buffer.from('x'),
          mimeType: 'image/jpeg',
        }),
      ).rejects.toMatchObject({
        code: 'NO_FACE_AADHAAR',
        status: 409,
      } as Partial<KycMlError>);
    });

    it('maps a 5xx to ServiceUnavailableException', async () => {
      const c = buildClient(baseEnv);
      fetchSpy.mockResolvedValueOnce(new Response('boom', { status: 502 }));
      await expect(
        c.processAadhaar({
          userId: 'u',
          fileBuffer: Buffer.from('x'),
          mimeType: 'image/jpeg',
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('maps a network failure to ServiceUnavailableException', async () => {
      const c = buildClient(baseEnv);
      fetchSpy.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));
      await expect(
        c.processAadhaar({
          userId: 'u',
          fileBuffer: Buffer.from('x'),
          mimeType: 'image/jpeg',
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('throws ServiceUnavailable if disabled', async () => {
      const c = buildClient({ ...baseEnv, KYC_ML_ENABLED: 'false' });
      await expect(
        c.processAadhaar({
          userId: 'u',
          fileBuffer: Buffer.from('x'),
          mimeType: 'image/jpeg',
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('verifyPatientIdentity', () => {
    it('hits the verify endpoint and returns the match payload', async () => {
      const c = buildClient(baseEnv);
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            matched: true,
            distance: 0.12,
            similarity: 0.88,
            threshold: 0.3,
            cleaned_up: true,
          }),
          { status: 200 },
        ),
      );
      const out = await c.verifyPatientIdentity({
        userId: 'u',
        fileBuffer: Buffer.from('selfie'),
        mimeType: 'image/jpeg',
      });
      expect(out.matched).toBe(true);
      expect(out.cleaned_up).toBe(true);
      const [url] = fetchSpy.mock.calls[0]!;
      expect(url).toBe('http://kyc-ml:8001/verify-patient-identity');
    });
  });

  describe('mapKycMlErrorStatus', () => {
    it.each([
      ['NO_FACE_AADHAAR', HttpStatus.CONFLICT],
      ['NO_FACE_SELFIE', HttpStatus.CONFLICT],
      ['LOW_CONFIDENCE', HttpStatus.UNPROCESSABLE_ENTITY],
      ['AADHAAR_FACE_NOT_FOUND', HttpStatus.NOT_FOUND],
      ['INVALID_IMAGE', HttpStatus.BAD_REQUEST],
      ['OCR_FAILED', HttpStatus.BAD_REQUEST],
      ['SOMETHING_NEW', HttpStatus.BAD_GATEWAY],
    ])('maps %s correctly', (code, status) => {
      expect(mapKycMlErrorStatus(code)).toBe(status);
    });
  });
});

import { ConfigService } from '@nestjs/config';
import { NmcApiProvider } from './nmc-api.provider';

function makeProvider(): NmcApiProvider {
  const config = {
    get: (key: string, def?: string) => {
      const values: Record<string, string> = {
        NMC_API_PROVIDER: 'surepass',
        NMC_API_URL:
          'https://kyc-api.surepass.app/api/v1/doctor/doctor-verification',
        NMC_API_KEY: 'test-key',
      };
      return values[key] ?? def;
    },
  } as unknown as ConfigService;
  return new NmcApiProvider(config);
}

describe('NmcApiProvider.callExternalApi error handling', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('throws structured HTTP error (no SyntaxError) when Surepass returns a non-JSON 401 HTML body', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response('<html><body>Unauthorized</body></html>', {
        status: 401,
        headers: { 'Content-Type': 'text/html' },
      }),
    ) as unknown as typeof fetch;

    const provider = makeProvider();

    await expect(
      provider.verify({
        memberId: '12345',
        stateCouncil: 'Tamil Nadu Medical Council',
        yearOfAdmission: '1900',
      }),
    ).rejects.toThrow('NMC API (surepass) returned HTTP 401');
  });

  it('wraps a network error (fetch rejection) as a request-failed error', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('ECONNRESET')) as unknown as typeof fetch;

    const provider = makeProvider();

    await expect(
      provider.verify({
        memberId: '12345',
        stateCouncil: 'Tamil Nadu Medical Council',
        yearOfAdmission: '1900',
      }),
    ).rejects.toThrow(/NMC API \(surepass\) request failed: ECONNRESET/);
  });

  it('reports a timeout when the request is aborted', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    global.fetch = jest
      .fn()
      .mockRejectedValue(abortError) as unknown as typeof fetch;

    const provider = makeProvider();

    await expect(
      provider.verify({
        memberId: '12345',
        stateCouncil: 'Tamil Nadu Medical Council',
        yearOfAdmission: '1900',
      }),
    ).rejects.toThrow('NMC API (surepass) timed out after 30s');
  });
});

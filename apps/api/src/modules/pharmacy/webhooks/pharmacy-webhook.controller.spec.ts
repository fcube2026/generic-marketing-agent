import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { PharmacyWebhookController } from './pharmacy-webhook.controller';

describe('PharmacyWebhookController (HMAC verification)', () => {
  const ORIGINAL_SECRET = process.env.PHARMACY_WEBHOOK_SECRET;

  const mockWebhookService = {
    handleOrderStatusWebhook: jest.fn().mockResolvedValue({
      processed: true,
      message: 'ok',
      orderId: 'order-1',
      status: 'CONFIRMED',
    }),
  } as any;
  const mockSimulator = {} as any;

  let controller: PharmacyWebhookController;

  beforeEach(() => {
    controller = new PharmacyWebhookController(
      mockWebhookService,
      mockSimulator,
    );
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.PHARMACY_WEBHOOK_SECRET;
    } else {
      process.env.PHARMACY_WEBHOOK_SECRET = ORIGINAL_SECRET;
    }
  });

  describe('mock partner (existing flow)', () => {
    it('processes a mock webhook without any signature header', async () => {
      const payload: any = {
        orderId: 'order-1',
        status: 'CONFIRMED',
        timestamp: '2026-04-23T00:00:00Z',
      };
      const result = await controller.handleOrderStatusWebhook(
        'mock',
        payload,
        { rawBody: Buffer.from(JSON.stringify(payload)) },
        undefined,
        undefined,
      );

      expect(result.processed).toBe(true);
      expect(mockWebhookService.handleOrderStatusWebhook).toHaveBeenCalledWith(
        'mock',
        'order-1',
        'CONFIRMED',
        '2026-04-23T00:00:00Z',
      );
    });

    it('rejects an invalid mock secret', async () => {
      const payload: any = {
        orderId: 'order-1',
        status: 'CONFIRMED',
        timestamp: '2026-04-23T00:00:00Z',
      };
      await expect(
        controller.handleOrderStatusWebhook(
          'mock',
          payload,
          { rawBody: Buffer.from(JSON.stringify(payload)) },
          'wrong-secret',
          undefined,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('partner code validation', () => {
    it('rejects unknown partner codes', async () => {
      const payload: any = {
        orderId: 'order-1',
        status: 'CONFIRMED',
        timestamp: '2026-04-23T00:00:00Z',
      };
      await expect(
        controller.handleOrderStatusWebhook(
          'unknown-partner',
          payload,
          { rawBody: Buffer.from('{}') },
          undefined,
          undefined,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ---------------------------------------------------------------------------
  // The HMAC code path is exercised through `verifyHmacSignature`. We test it
  // directly because the only currently-registered partner code is 'mock'
  // (which is intentionally exempt from HMAC checks).
  // ---------------------------------------------------------------------------
  describe('verifyHmacSignature (private)', () => {
    const verify = (rawBody: Buffer | undefined, signature?: string) =>
      (controller as any).verifyHmacSignature(rawBody, signature);

    it('allows the request when PHARMACY_WEBHOOK_SECRET is unset (DEV ONLY)', () => {
      delete process.env.PHARMACY_WEBHOOK_SECRET;
      expect(() => verify(Buffer.from('{}'), undefined)).not.toThrow();
    });

    it('rejects when secret is set but signature header is missing', () => {
      process.env.PHARMACY_WEBHOOK_SECRET = 'super-secret';
      expect(() => verify(Buffer.from('{}'), undefined)).toThrow(
        UnauthorizedException,
      );
    });

    it('rejects when raw body is unavailable', () => {
      process.env.PHARMACY_WEBHOOK_SECRET = 'super-secret';
      expect(() => verify(undefined, 'deadbeef')).toThrow(
        UnauthorizedException,
      );
    });

    it('rejects on invalid signature', () => {
      process.env.PHARMACY_WEBHOOK_SECRET = 'super-secret';
      const body = Buffer.from('{"orderId":"order-1"}');
      const wrong = createHmac('sha256', 'WRONG-secret')
        .update(body)
        .digest('hex');
      expect(() => verify(body, wrong)).toThrow(UnauthorizedException);
    });

    it('accepts a valid HMAC-SHA256 signature', () => {
      process.env.PHARMACY_WEBHOOK_SECRET = 'super-secret';
      const body = Buffer.from('{"orderId":"order-1"}');
      const sig = createHmac('sha256', 'super-secret')
        .update(body)
        .digest('hex');
      expect(() => verify(body, sig)).not.toThrow();
    });

    it('accepts an upper-cased signature header (case-insensitive hex)', () => {
      process.env.PHARMACY_WEBHOOK_SECRET = 'super-secret';
      const body = Buffer.from('{"x":1}');
      const sig = createHmac('sha256', 'super-secret')
        .update(body)
        .digest('hex')
        .toUpperCase();
      expect(() => verify(body, sig)).not.toThrow();
    });
  });
});

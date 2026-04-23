import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
  HttpCode,
  BadRequestException,
  UnauthorizedException,
  UseGuards,
  Logger,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiHeader,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { createHmac, timingSafeEqual } from 'crypto';
import { Public } from '../../auth/decorators/roles.decorator';
import { PharmacyOrderWebhookService } from './pharmacy-order-webhook.service';
import { MockWebhookSimulatorService } from './mock-webhook-simulator.service';
import { PharmacyWebhookPayloadDto } from './dto/pharmacy-webhook-payload.dto';
import { WebhookRateLimitGuard } from './guards/webhook-rate-limit.guard';

/** Allowed partner codes. In production, this would come from the database. */
const VALID_PARTNER_CODES = new Set(['mock']);

/** Expected mock secret for basic validation. */
const MOCK_SECRET = 'mock-webhook-secret';

@ApiTags('Pharmacy Webhooks')
@Controller('pharmacy/webhooks')
export class PharmacyWebhookController {
  private readonly logger = new Logger(PharmacyWebhookController.name);

  constructor(
    private readonly webhookService: PharmacyOrderWebhookService,
    private readonly simulatorService: MockWebhookSimulatorService,
  ) {}

  // ---------------------------------------------------------------------------
  // Primary webhook endpoint (receives partner callbacks)
  // ---------------------------------------------------------------------------

  /**
   * POST /pharmacy/webhooks/:partnerCode/order-status
   *
   * Receives order status updates from pharmacy partners.
   * For mock partner, validates x-mock-secret header.
   * Structured for future HMAC signature verification with real partners.
   */
  @Public()
  @Post(':partnerCode/order-status')
  @HttpCode(200)
  @UseGuards(WebhookRateLimitGuard)
  @ApiOperation({
    summary: 'Receive pharmacy order status webhook',
    description:
      'Endpoint for pharmacy partners to push order status updates. ' +
      'Validates the partner code and processes status changes with ' +
      'idempotency guarantees. For the mock partner, an optional ' +
      'x-mock-secret header can be provided for basic authentication.',
  })
  @ApiParam({
    name: 'partnerCode',
    description: 'Pharmacy partner code (e.g., "mock")',
    example: 'mock',
  })
  @ApiHeader({
    name: 'x-mock-secret',
    description: 'Secret token for mock partner validation (optional)',
    required: false,
  })
  @ApiHeader({
    name: 'x-signature',
    description:
      'HMAC-SHA256 signature of the raw request body, hex-encoded. ' +
      'Required for non-mock partners when PHARMACY_WEBHOOK_SECRET is set.',
    required: false,
  })
  @ApiOkResponse({
    description: 'Webhook processed (or idempotently skipped)',
    schema: {
      example: {
        processed: true,
        message: 'Order status updated: PENDING → CONFIRMED',
        orderId: 'clxyz123',
        status: 'CONFIRMED',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid partner code or payload' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async handleOrderStatusWebhook(
    @Param('partnerCode') partnerCode: string,
    @Body() payload: PharmacyWebhookPayloadDto,
    @Req() request: { rawBody?: Buffer },
    @Headers('x-mock-secret') mockSecret?: string,
    @Headers('x-signature') signature?: string,
  ) {
    // Validate partner code
    if (!VALID_PARTNER_CODES.has(partnerCode)) {
      throw new BadRequestException(`Unknown partner code: ${partnerCode}`);
    }

    // Basic security for mock partner — preserves the existing mock flow.
    if (partnerCode === 'mock' && mockSecret && mockSecret !== MOCK_SECRET) {
      throw new UnauthorizedException('Invalid mock secret');
    }

    // HMAC-SHA256 signature verification for real partners.
    // The mock partner is intentionally exempt so existing dev/test flows
    // (including the in-memory simulator) continue to work without a secret.
    if (partnerCode !== 'mock') {
      this.verifyHmacSignature(request?.rawBody, signature);
    }

    this.logger.log(
      `[webhook] Received status update from "${partnerCode}": ` +
        `orderId="${payload.orderId}" status="${payload.status}"`,
    );

    return this.webhookService.handleOrderStatusWebhook(
      partnerCode,
      payload.orderId,
      payload.status,
      payload.timestamp,
    );
  }

  // ---------------------------------------------------------------------------
  // Mock simulator endpoints (for development & testing)
  // ---------------------------------------------------------------------------

  /**
   * POST /pharmacy/webhooks/simulate/:partnerOrderId/start
   * Start automatic status progression simulation for a mock order.
   */
  @Public()
  @Post('simulate/:partnerOrderId/start')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Start mock webhook simulation',
    description:
      'Starts automatic status progression for a mock pharmacy order. ' +
      'Simulates realistic webhook callbacks at configurable intervals.',
  })
  @ApiParam({
    name: 'partnerOrderId',
    description: 'Partner order ID (from mock pharmacy provider)',
  })
  @ApiOkResponse({
    description: 'Simulation started',
    schema: {
      example: {
        started: true,
        partnerOrderId: 'MOCK-ORD-1234',
        message: 'Simulation started with 5 steps at 4000ms intervals',
      },
    },
  })
  startSimulation(
    @Param('partnerOrderId') partnerOrderId: string,
    @Body('delayMs') delayMs?: number,
    @Body('maxSteps') maxSteps?: number,
  ) {
    return this.simulatorService.startSimulation(partnerOrderId, {
      delayMs,
      maxSteps,
    });
  }

  /**
   * POST /pharmacy/webhooks/simulate/:partnerOrderId/stop
   * Stop an active simulation for a mock order.
   */
  @Public()
  @Post('simulate/:partnerOrderId/stop')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Stop mock webhook simulation',
    description: 'Stops an active status progression simulation.',
  })
  stopSimulation(@Param('partnerOrderId') partnerOrderId: string) {
    const stopped = this.simulatorService.stopSimulation(partnerOrderId);
    return {
      stopped,
      partnerOrderId,
      message: stopped ? 'Simulation stopped' : 'No active simulation found',
    };
  }

  /**
   * POST /pharmacy/webhooks/simulate/:partnerOrderId/trigger
   * Manually trigger a single webhook for testing.
   */
  @Public()
  @Post('simulate/:partnerOrderId/trigger')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Trigger a single mock webhook',
    description:
      'Manually sends a single status update webhook for a mock order.',
  })
  triggerSingleWebhook(
    @Param('partnerOrderId') partnerOrderId: string,
    @Body('status') status: string,
  ) {
    if (!status) {
      throw new BadRequestException('status is required');
    }
    return this.simulatorService.triggerSingleWebhook(
      partnerOrderId,
      status as any,
    );
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Verify the `x-signature` header against an HMAC-SHA256 of the raw request
   * body using `PHARMACY_WEBHOOK_SECRET`.
   *
   * Behaviour:
   *  - If `PHARMACY_WEBHOOK_SECRET` is not configured, logs a warning and
   *    allows the request through (DEV ONLY — production deployments MUST
   *    set this env var).
   *  - If the secret IS configured, the `x-signature` header is required and
   *    must match exactly. Mismatches throw `UnauthorizedException`.
   *  - Comparison uses `crypto.timingSafeEqual` to prevent timing attacks.
   */
  private verifyHmacSignature(
    rawBody: Buffer | undefined,
    signature: string | undefined,
  ): void {
    const secret = process.env.PHARMACY_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.warn(
        '[webhook] PHARMACY_WEBHOOK_SECRET is not configured. ' +
          'Skipping HMAC verification (DEV ONLY).',
      );
      return;
    }

    if (!signature) {
      throw new UnauthorizedException('Missing webhook signature');
    }

    if (!rawBody || rawBody.length === 0) {
      throw new UnauthorizedException(
        'Cannot verify webhook signature: raw body unavailable',
      );
    }

    const expectedSignature = createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const provided = signature.trim().toLowerCase();
    const expected = expectedSignature.toLowerCase();

    if (provided.length !== expected.length) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const a = Buffer.from(provided, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (!timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }
}

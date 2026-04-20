import { Injectable, Logger } from '@nestjs/common';
import {
  PharmacyOrderWebhookService,
  WebhookProcessingResult,
} from './pharmacy-order-webhook.service';
import { PartnerStatusValue } from './dto/pharmacy-webhook-payload.dto';

/**
 * Status progression used by the mock simulator.
 * Each entry maps to a partner-status string sent via the webhook.
 */
const MOCK_STATUS_PROGRESSION: PartnerStatusValue[] = [
  'confirmed',
  'packed',
  'dispatched',
  'out_for_delivery',
  'delivered',
];

/** Default delay between simulated status updates (ms). */
const DEFAULT_DELAY_MS = 4_000;

export interface SimulationConfig {
  /** Delay between each status update in ms. Default: 4000. */
  delayMs?: number;
  /** Maximum number of statuses to progress through. Default: all remaining. */
  maxSteps?: number;
}

@Injectable()
export class MockWebhookSimulatorService {
  private readonly logger = new Logger(MockWebhookSimulatorService.name);

  /** Active simulation timers keyed by partnerOrderId. */
  private readonly activeSimulations = new Map<string, NodeJS.Timeout>();

  constructor(private readonly webhookService: PharmacyOrderWebhookService) {}

  /**
   * Start simulating webhook status progression for a given partner order.
   * Sends internal webhook calls at configurable intervals.
   */
  startSimulation(
    partnerOrderId: string,
    config: SimulationConfig = {},
  ): { started: boolean; partnerOrderId: string; message: string } {
    const { delayMs = DEFAULT_DELAY_MS, maxSteps } = config;

    // Cancel any existing simulation for this order
    this.stopSimulation(partnerOrderId);

    const steps =
      maxSteps !== undefined
        ? MOCK_STATUS_PROGRESSION.slice(0, maxSteps)
        : [...MOCK_STATUS_PROGRESSION];

    if (steps.length === 0) {
      return {
        started: false,
        partnerOrderId,
        message: 'No steps to simulate',
      };
    }

    this.logger.log(
      `[mock-simulator] Starting simulation for order "${partnerOrderId}" ` +
        `(${steps.length} steps, ${delayMs}ms interval)`,
    );

    let stepIndex = 0;

    const scheduleNext = () => {
      if (stepIndex >= steps.length) {
        this.activeSimulations.delete(partnerOrderId);
        this.logger.log(
          `[mock-simulator] Simulation completed for order "${partnerOrderId}"`,
        );
        return;
      }

      const status = steps[stepIndex];
      stepIndex++;

      const timer = setTimeout(async () => {
        try {
          const result = await this.webhookService.handleOrderStatusWebhook(
            'mock',
            partnerOrderId,
            status,
            new Date().toISOString(),
          );

          this.logger.log(
            `[mock-simulator] Webhook sent: order="${partnerOrderId}" ` +
              `status="${status}" processed=${result.processed}`,
          );
        } catch (err) {
          this.logger.error(
            `[mock-simulator] Webhook failed for order "${partnerOrderId}" ` +
              `status="${status}": ${(err as Error).message}`,
          );
        }

        // Schedule the next step
        scheduleNext();
      }, delayMs);

      this.activeSimulations.set(partnerOrderId, timer);
    };

    scheduleNext();

    return {
      started: true,
      partnerOrderId,
      message: `Simulation started with ${steps.length} steps at ${delayMs}ms intervals`,
    };
  }

  /** Stop an active simulation for the given order. */
  stopSimulation(partnerOrderId: string): boolean {
    const timer = this.activeSimulations.get(partnerOrderId);
    if (timer) {
      clearTimeout(timer);
      this.activeSimulations.delete(partnerOrderId);
      this.logger.log(
        `[mock-simulator] Simulation stopped for order "${partnerOrderId}"`,
      );
      return true;
    }
    return false;
  }

  /** Check if a simulation is active for the given order. */
  isSimulationActive(partnerOrderId: string): boolean {
    return this.activeSimulations.has(partnerOrderId);
  }

  /**
   * Trigger a single webhook call for the given order with a specific status.
   * Useful for testing individual status updates.
   */
  async triggerSingleWebhook(
    partnerOrderId: string,
    status: PartnerStatusValue,
  ): Promise<WebhookProcessingResult> {
    this.logger.log(
      `[mock-simulator] Manual webhook trigger: order="${partnerOrderId}" status="${status}"`,
    );

    return this.webhookService.handleOrderStatusWebhook(
      'mock',
      partnerOrderId,
      status,
      new Date().toISOString(),
    );
  }
}

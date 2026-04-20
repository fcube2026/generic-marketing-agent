import { Injectable, Logger } from '@nestjs/common';
import { MockPharmacyProvider } from '../providers/mock-pharmacy.provider';

export interface OrderStatusEvent {
  partnerOrderId: string;
  status: string;
  updatedAt: string;
  simulatedAt: string;
}

export interface SimulationHandle {
  partnerOrderId: string;
  remainingSteps: number;
  intervalMs: number;
}

/**
 * PharmacyWebhookService
 *
 * Simulates partner-initiated webhook callbacks for order status progression.
 * In a real integration this service would be replaced by an HTTP handler that
 * receives push notifications from the partner's webhook endpoint.
 *
 * Architecture:
 *  - Uses the MockPharmacyProvider's in-memory order store.
 *  - Schedules periodic "nudges" that advance an order through its lifecycle.
 *  - Emits events to a configurable in-memory listener list.
 */
@Injectable()
export class PharmacyWebhookService {
  private readonly logger = new Logger(PharmacyWebhookService.name);

  /** Active simulation timers keyed by partnerOrderId. */
  private readonly timers = new Map<string, NodeJS.Timeout>();

  /** In-memory event log (last 200 events). */
  private readonly eventLog: OrderStatusEvent[] = [];
  private readonly MAX_LOG_SIZE = 200;

  /** Registered event listeners. */
  private readonly listeners: Array<(event: OrderStatusEvent) => void> = [];

  constructor(private readonly mockProvider: MockPharmacyProvider) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Start simulating order status progression for a given partner order.
   *
   * @param partnerOrderId  The ID returned by the mock provider on order creation.
   * @param intervalMs      How often to advance the status (default: 15 000ms).
   * @param maxSteps        Maximum number of progression steps (default: 5 — up to DELIVERED).
   */
  scheduleProgression(
    partnerOrderId: string,
    intervalMs = 15_000,
    maxSteps = 5,
  ): SimulationHandle {
    // Cancel any existing timer for this order
    this.cancelProgression(partnerOrderId);

    let steps = 0;

    if (maxSteps <= 0) {
      this.logger.log(
        `[webhook] maxSteps=${maxSteps} — nothing to schedule for order "${partnerOrderId}"`,
      );
      return { partnerOrderId, remainingSteps: 0, intervalMs };
    }

    const scheduleNext = () => {
      if (steps >= maxSteps) {
        this.timers.delete(partnerOrderId);
        return;
      }

      const event = this.mockProvider.simulateNextStatusEvent(partnerOrderId);
      if (!event) {
        // Order reached a terminal state
        this.timers.delete(partnerOrderId);
        return;
      }

      steps++;
      const statusEvent: OrderStatusEvent = {
        ...event,
        simulatedAt: new Date().toISOString(),
      };

      this.emit(statusEvent);

      // Schedule next step unless we have reached the limit
      if (steps < maxSteps) {
        const timer = setTimeout(scheduleNext, intervalMs);
        this.timers.set(partnerOrderId, timer);
      } else {
        this.timers.delete(partnerOrderId);
      }
    };

    const timer = setTimeout(scheduleNext, intervalMs);
    this.timers.set(partnerOrderId, timer);

    this.logger.log(
      `[webhook] Scheduled progression for order "${partnerOrderId}" every ${intervalMs}ms (max ${maxSteps} steps)`,
    );

    return { partnerOrderId, remainingSteps: maxSteps, intervalMs };
  }

  /** Cancel a pending simulation for the given order. */
  cancelProgression(partnerOrderId: string): void {
    const existing = this.timers.get(partnerOrderId);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(partnerOrderId);
      this.logger.log(
        `[webhook] Cancelled progression for order "${partnerOrderId}"`,
      );
    }
  }

  /**
   * Immediately trigger one status advancement for the given order.
   * Useful for testing or on-demand webhook delivery.
   */
  triggerNext(partnerOrderId: string): OrderStatusEvent | null {
    const event = this.mockProvider.simulateNextStatusEvent(partnerOrderId);
    if (!event) {
      this.logger.log(
        `[webhook] No more status transitions for order "${partnerOrderId}"`,
      );
      return null;
    }

    const statusEvent: OrderStatusEvent = {
      ...event,
      simulatedAt: new Date().toISOString(),
    };
    this.emit(statusEvent);
    return statusEvent;
  }

  /** Return recent events from the in-memory event log. */
  getEventLog(limit = 50): OrderStatusEvent[] {
    return this.eventLog.slice(-Math.min(limit, this.MAX_LOG_SIZE));
  }

  /**
   * Register a listener that is called whenever a status event is emitted.
   * Returns an unsubscribe function.
   */
  subscribe(listener: (event: OrderStatusEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx !== -1) this.listeners.splice(idx, 1);
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private emit(event: OrderStatusEvent): void {
    this.logger.log(
      `[webhook] Status event: orderId="${event.partnerOrderId}" status="${event.status}"`,
    );

    // Append to log, trim if necessary
    this.eventLog.push(event);
    if (this.eventLog.length > this.MAX_LOG_SIZE) {
      this.eventLog.splice(0, this.eventLog.length - this.MAX_LOG_SIZE);
    }

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        this.logger.warn(
          `[webhook] Listener threw an error: ${(err as Error).message}`,
        );
      }
    }
  }
}

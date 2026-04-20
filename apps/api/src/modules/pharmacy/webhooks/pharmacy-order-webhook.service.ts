import { Injectable, Logger } from '@nestjs/common';
import { PharmacyOrderStatus } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PartnerStatusValue } from './dto/pharmacy-webhook-payload.dto';

/** Maps partner-side status strings to our internal enum. */
const STATUS_MAP: Record<string, PharmacyOrderStatus> = {
  accepted: PharmacyOrderStatus.CONFIRMED,
  confirmed: PharmacyOrderStatus.CONFIRMED,
  packed: PharmacyOrderStatus.PACKED,
  dispatched: PharmacyOrderStatus.SHIPPED,
  shipped: PharmacyOrderStatus.SHIPPED,
  out_for_delivery: PharmacyOrderStatus.OUT_FOR_DELIVERY,
  delivered: PharmacyOrderStatus.DELIVERED,
  cancelled: PharmacyOrderStatus.CANCELLED,
};

/** Ordered progression for validating forward-only status transitions. */
const STATUS_ORDER: PharmacyOrderStatus[] = [
  PharmacyOrderStatus.PENDING,
  PharmacyOrderStatus.PRESCRIPTION_REVIEW,
  PharmacyOrderStatus.CONFIRMED,
  PharmacyOrderStatus.PACKED,
  PharmacyOrderStatus.SHIPPED,
  PharmacyOrderStatus.OUT_FOR_DELIVERY,
  PharmacyOrderStatus.DELIVERED,
];

export interface WebhookProcessingResult {
  processed: boolean;
  message: string;
  orderId?: string;
  status?: PharmacyOrderStatus;
}

export interface OrderStatusUpdatedEvent {
  orderId: string;
  pharmacyOrderId: string;
  previousStatus: PharmacyOrderStatus;
  newStatus: PharmacyOrderStatus;
  partnerCode: string;
  timestamp: string;
}

@Injectable()
export class PharmacyOrderWebhookService {
  private readonly logger = new Logger(PharmacyOrderWebhookService.name);

  /** Event listeners for order.status.updated events. */
  private readonly listeners: Array<(event: OrderStatusUpdatedEvent) => void> =
    [];

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Process an incoming webhook payload from a pharmacy partner.
   *
   * Steps:
   * 1. Map partner status to internal enum
   * 2. Find order by partnerOrderId
   * 3. Idempotency check (skip if same or backward status)
   * 4. Update order status + add history record (in a transaction)
   * 5. Emit internal event + notification log
   */
  async handleOrderStatusWebhook(
    partnerCode: string,
    orderId: string,
    partnerStatus: PartnerStatusValue,
    timestamp?: string,
  ): Promise<WebhookProcessingResult> {
    const internalStatus = this.mapStatus(partnerStatus);
    if (!internalStatus) {
      this.logger.warn(
        `[webhook] Unknown partner status "${partnerStatus}" from ${partnerCode}`,
      );
      return {
        processed: false,
        message: `Unknown status: ${partnerStatus}`,
      };
    }

    // Find order by partnerOrderId
    const order = await this.prisma.pharmacyOrder.findFirst({
      where: { partnerOrderId: orderId },
    });

    if (!order) {
      this.logger.warn(
        `[webhook] Order not found for partnerOrderId="${orderId}" from ${partnerCode}`,
      );
      return {
        processed: false,
        message: `Order not found: ${orderId}`,
      };
    }

    // Idempotency: skip if status is the same
    if (order.status === internalStatus) {
      this.logger.log(
        `[webhook] Idempotent skip — order "${order.id}" already at status "${internalStatus}"`,
      );
      return {
        processed: false,
        message: `Order already at status ${internalStatus}`,
        orderId: order.id,
        status: internalStatus,
      };
    }

    // Validate forward-only progression (except CANCELLED which can come at any time)
    if (
      internalStatus !== PharmacyOrderStatus.CANCELLED &&
      !this.isForwardTransition(order.status, internalStatus)
    ) {
      this.logger.warn(
        `[webhook] Backward transition rejected: ${order.status} → ${internalStatus} for order "${order.id}"`,
      );
      return {
        processed: false,
        message: `Invalid transition from ${order.status} to ${internalStatus}`,
        orderId: order.id,
        status: order.status,
      };
    }

    // Check idempotency via unique constraint (order_id + status already exists in history)
    const existingHistoryEntry =
      await this.prisma.pharmacyOrderStatusHistory.findUnique({
        where: {
          pharmacyOrderId_status: {
            pharmacyOrderId: order.id,
            status: internalStatus,
          },
        },
      });

    if (existingHistoryEntry) {
      this.logger.log(
        `[webhook] Duplicate history entry — order "${order.id}" already recorded status "${internalStatus}"`,
      );
      return {
        processed: false,
        message: `Status ${internalStatus} already recorded in history`,
        orderId: order.id,
        status: internalStatus,
      };
    }

    const previousStatus = order.status;
    const eventTimestamp = timestamp || new Date().toISOString();

    // Atomic update: order status + history record
    await this.prisma.$transaction([
      this.prisma.pharmacyOrder.update({
        where: { id: order.id },
        data: {
          status: internalStatus,
          ...(internalStatus === PharmacyOrderStatus.DELIVERED
            ? { deliveredAt: new Date(eventTimestamp) }
            : {}),
        },
      }),
      this.prisma.pharmacyOrderStatusHistory.create({
        data: {
          pharmacyOrderId: order.id,
          status: internalStatus,
          source: `webhook:${partnerCode}`,
          timestamp: new Date(eventTimestamp),
        },
      }),
    ]);

    this.logger.log(
      `[webhook] Order "${order.id}" updated: ${previousStatus} → ${internalStatus}`,
    );

    // Emit internal event
    const event: OrderStatusUpdatedEvent = {
      orderId: order.partnerOrderId || orderId,
      pharmacyOrderId: order.id,
      previousStatus,
      newStatus: internalStatus,
      partnerCode,
      timestamp: eventTimestamp,
    };
    this.emitStatusUpdated(event);

    // Mock notification
    this.logNotification(order.id, internalStatus);

    return {
      processed: true,
      message: `Order status updated: ${previousStatus} → ${internalStatus}`,
      orderId: order.id,
      status: internalStatus,
    };
  }

  /**
   * Map a partner status string to the internal PharmacyOrderStatus enum.
   */
  mapStatus(partnerStatus: string): PharmacyOrderStatus | null {
    return STATUS_MAP[partnerStatus.toLowerCase()] ?? null;
  }

  /**
   * Register a listener for order.status.updated events.
   * Returns an unsubscribe function.
   */
  onStatusUpdated(
    listener: (event: OrderStatusUpdatedEvent) => void,
  ): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx !== -1) this.listeners.splice(idx, 1);
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Check if transitioning from `current` to `next` is a forward move. */
  private isForwardTransition(
    current: PharmacyOrderStatus,
    next: PharmacyOrderStatus,
  ): boolean {
    const currentIdx = STATUS_ORDER.indexOf(current);
    const nextIdx = STATUS_ORDER.indexOf(next);
    // If either status is not in the progression (e.g. RETURNED, REFUNDED), allow it
    if (currentIdx === -1 || nextIdx === -1) return true;
    return nextIdx > currentIdx;
  }

  /** Emit order.status.updated event to all registered listeners. */
  private emitStatusUpdated(event: OrderStatusUpdatedEvent): void {
    this.logger.log(
      `[event] order.status.updated — orderId="${event.pharmacyOrderId}" ` +
        `${event.previousStatus} → ${event.newStatus}`,
    );

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        this.logger.warn(`[event] Listener error: ${(err as Error).message}`);
      }
    }
  }

  /** Log a mock notification for the status update. */
  private logNotification(orderId: string, status: PharmacyOrderStatus): void {
    const messages: Record<string, string> = {
      CONFIRMED: 'Your pharmacy order has been confirmed!',
      PACKED: 'Your order has been packed and is ready for dispatch.',
      SHIPPED: 'Your order has been shipped!',
      OUT_FOR_DELIVERY: 'Your order is out for delivery!',
      DELIVERED: 'Your order has been delivered. Thank you!',
      CANCELLED: 'Your order has been cancelled.',
    };

    const message = messages[status] || `Order status updated: ${status}`;
    this.logger.log(`[notification] Order ${orderId}: ${message}`);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PharmacyOrderStatus } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PharmacyPartnerProvider } from '../providers/pharmacy-partner.interface';

/** Terminal statuses that should not be polled further. */
const TERMINAL_STATUSES: PharmacyOrderStatus[] = [
  PharmacyOrderStatus.DELIVERED,
  PharmacyOrderStatus.CANCELLED,
  PharmacyOrderStatus.RETURNED,
  PharmacyOrderStatus.REFUNDED,
];

/** Ordered status progression for forward-only validation. */
const STATUS_ORDER: PharmacyOrderStatus[] = [
  PharmacyOrderStatus.PENDING,
  PharmacyOrderStatus.PRESCRIPTION_REVIEW,
  PharmacyOrderStatus.CONFIRMED,
  PharmacyOrderStatus.PACKED,
  PharmacyOrderStatus.SHIPPED,
  PharmacyOrderStatus.OUT_FOR_DELIVERY,
  PharmacyOrderStatus.DELIVERED,
];

export interface PollResult {
  totalOrders: number;
  updated: number;
  skipped: number;
  errors: number;
}

export interface RefillReminderData {
  orderId: string;
  patientProfileId: string;
  orderNumber: string;
  deliveredAt: Date;
  refillDate: Date;
  reminderDate: Date;
  isFollowup: boolean;
}

@Injectable()
export class PharmacyJobService {
  private readonly logger = new Logger(PharmacyJobService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly partnerProviders: Map<string, PharmacyPartnerProvider>,
  ) {}

  // ---------------------------------------------------------------------------
  // Order Status Polling
  // ---------------------------------------------------------------------------

  /**
   * Poll all active (non-terminal) orders and update their statuses from
   * the mock provider. This acts as a fallback for webhook delivery.
   */
  async pollOrderStatuses(): Promise<PollResult> {
    const activeOrders = await this.prisma.pharmacyOrder.findMany({
      where: {
        status: { notIn: TERMINAL_STATUSES },
        partnerOrderId: { not: null },
      },
      include: { pharmacyPartner: true },
    });

    const result: PollResult = {
      totalOrders: activeOrders.length,
      updated: 0,
      skipped: 0,
      errors: 0,
    };

    this.logger.log(
      `[poll] Found ${activeOrders.length} active order(s) to poll`,
    );

    for (const order of activeOrders) {
      try {
        const newStatus = await this.getMockOrderStatus(order.partnerOrderId!);
        if (!newStatus) {
          result.skipped++;
          continue;
        }

        const mapped = this.mapPartnerStatus(newStatus);

        // Idempotency: skip if status is unchanged
        if (mapped === order.status) {
          result.skipped++;
          continue;
        }

        // Validate forward-only transition
        if (
          mapped !== PharmacyOrderStatus.CANCELLED &&
          !this.isForwardTransition(order.status, mapped)
        ) {
          this.logger.warn(
            `[poll] Backward transition rejected: ${order.status} → ${mapped} for order "${order.id}"`,
          );
          result.skipped++;
          continue;
        }

        await this.updateOrderStatus(order.id, mapped);
        result.updated++;

        this.logger.log(
          `[poll] Order "${order.id}" updated: ${order.status} → ${mapped}`,
        );
      } catch (err) {
        result.errors++;
        this.logger.error(
          `[poll] Failed to poll order "${order.id}": ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(
      `[poll] Complete — updated=${result.updated} skipped=${result.skipped} errors=${result.errors}`,
    );

    return result;
  }

  /**
   * Fetch the latest order status from the mock pharmacy provider.
   * Returns `null` if the order is not found on the provider side.
   */
  async getMockOrderStatus(partnerOrderId: string): Promise<string | null> {
    const provider = this.partnerProviders.get('mock');
    if (!provider) {
      this.logger.warn('[poll] No mock provider registered');
      return null;
    }

    try {
      const result = await provider.getOrderStatus(partnerOrderId);
      return result.status;
    } catch (err) {
      this.logger.warn(
        `[poll] Failed to fetch status for "${partnerOrderId}": ${(err as Error).message}`,
      );
      throw err;
    }
  }

  /**
   * Atomically update the order status and insert a status history record.
   * Uses the unique(pharmacyOrderId, status) constraint for idempotency.
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: PharmacyOrderStatus,
  ): Promise<void> {
    // Check if history entry already exists (idempotency guard)
    const existingHistory =
      await this.prisma.pharmacyOrderStatusHistory.findUnique({
        where: {
          pharmacyOrderId_status: {
            pharmacyOrderId: orderId,
            status: newStatus,
          },
        },
      });

    if (existingHistory) {
      this.logger.log(
        `[poll] Duplicate history entry — order "${orderId}" already recorded status "${newStatus}"`,
      );
      return;
    }

    await this.prisma.$transaction([
      this.prisma.pharmacyOrder.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          ...(newStatus === PharmacyOrderStatus.DELIVERED
            ? { deliveredAt: new Date() }
            : {}),
        },
      }),
      this.prisma.pharmacyOrderStatusHistory.create({
        data: {
          pharmacyOrderId: orderId,
          status: newStatus,
          source: 'polling:background-job',
        },
      }),
    ]);
  }

  // ---------------------------------------------------------------------------
  // Refill Reminder
  // ---------------------------------------------------------------------------

  /**
   * Calculate when a refill reminder should be sent.
   *
   * @param deliveredAt         When the order was delivered
   * @param prescriptionDays    Duration of the prescription in days
   * @param reminderDaysBefore  How many days before the refill date to send reminder
   */
  calculateRefillReminderDate(
    deliveredAt: Date,
    prescriptionDays: number,
    reminderDaysBefore: number,
  ): { refillDate: Date; reminderDate: Date } {
    const refillDate = new Date(deliveredAt);
    refillDate.setDate(refillDate.getDate() + prescriptionDays);

    const reminderDate = new Date(refillDate);
    reminderDate.setDate(reminderDate.getDate() - reminderDaysBefore);

    return { refillDate, reminderDate };
  }

  /**
   * Send a refill reminder notification (mock — console.log for now).
   * Structured for future push notification integration.
   */
  async sendNotification(data: RefillReminderData): Promise<void> {
    const reorderLink = `/pharmacy/reorder/${data.orderId}`;
    const type = data.isFollowup ? 'FOLLOW-UP REMINDER' : 'REMINDER';

    this.logger.log(
      `[notification] 📋 REFILL ${type} — ` +
        `Order: ${data.orderNumber} | ` +
        `Patient: ${data.patientProfileId} | ` +
        `Refill Date: ${data.refillDate.toISOString().split('T')[0]} | ` +
        `Reorder: ${reorderLink}`,
    );

    // Future: integrate with PushNotificationModule
    // await this.pushNotificationService.send({
    //   userId: data.patientProfileId,
    //   title: 'Time to refill your prescription!',
    //   body: `Your prescription from order ${data.orderNumber} is running low.`,
    //   data: { type: 'REFILL_REMINDER', orderId: data.orderId, reorderLink },
    // });
  }

  /**
   * Check whether a refill reminder has already been sent for a specific order + type.
   * Uses status history as a simple deduplication mechanism.
   */
  async hasReminderBeenSent(
    orderId: string,
    isFollowup: boolean,
  ): Promise<boolean> {
    const source = isFollowup
      ? 'refill-reminder:followup'
      : 'refill-reminder:initial';

    const existing = await this.prisma.pharmacyOrderStatusHistory.findFirst({
      where: {
        pharmacyOrderId: orderId,
        source,
      },
    });

    return !!existing;
  }

  /**
   * Record that a refill reminder has been sent (for deduplication).
   */
  async recordReminderSent(
    orderId: string,
    isFollowup: boolean,
  ): Promise<void> {
    const source = isFollowup
      ? 'refill-reminder:followup'
      : 'refill-reminder:initial';

    // Use upsert-like logic: check if already exists
    const existing = await this.prisma.pharmacyOrderStatusHistory.findFirst({
      where: { pharmacyOrderId: orderId, source },
    });

    if (!existing) {
      await this.prisma.pharmacyOrderStatusHistory.create({
        data: {
          pharmacyOrderId: orderId,
          status: PharmacyOrderStatus.DELIVERED, // reminder is post-delivery
          source,
        },
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Map partner status string to internal PharmacyOrderStatus. */
  private mapPartnerStatus(partnerStatus: string): PharmacyOrderStatus {
    const normalized = partnerStatus.toUpperCase();
    const statusMap: Record<string, PharmacyOrderStatus> = {
      PLACED: PharmacyOrderStatus.PENDING,
      PENDING: PharmacyOrderStatus.PENDING,
      PRESCRIPTION_REVIEW: PharmacyOrderStatus.PRESCRIPTION_REVIEW,
      CONFIRMED: PharmacyOrderStatus.CONFIRMED,
      PACKED: PharmacyOrderStatus.PACKED,
      SHIPPED: PharmacyOrderStatus.SHIPPED,
      OUT_FOR_DELIVERY: PharmacyOrderStatus.OUT_FOR_DELIVERY,
      DELIVERED: PharmacyOrderStatus.DELIVERED,
      CANCELLED: PharmacyOrderStatus.CANCELLED,
      RETURNED: PharmacyOrderStatus.RETURNED,
      REFUNDED: PharmacyOrderStatus.REFUNDED,
    };

    return statusMap[normalized] ?? PharmacyOrderStatus.PENDING;
  }

  /** Check if transitioning from `current` to `next` is a forward move. */
  private isForwardTransition(
    current: PharmacyOrderStatus,
    next: PharmacyOrderStatus,
  ): boolean {
    const currentIdx = STATUS_ORDER.indexOf(current);
    const nextIdx = STATUS_ORDER.indexOf(next);
    if (currentIdx === -1 || nextIdx === -1) return true;
    return nextIdx > currentIdx;
  }
}

import { PharmacyOrderStatus } from '@prisma/client';
import { PharmacyOrderWebhookService } from './pharmacy-order-webhook.service';

describe('PharmacyOrderWebhookService', () => {
  let service: PharmacyOrderWebhookService;
  const mockNotifications = {
    sendNotification: jest.fn(),
  } as any;

  const mockPrisma = {
    pharmacyOrder: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    pharmacyOrderStatusHistory: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;

  beforeEach(() => {
    service = new PharmacyOrderWebhookService(mockPrisma, mockNotifications);
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Status mapping
  // ---------------------------------------------------------------------------

  describe('mapStatus', () => {
    it('maps "accepted" to CONFIRMED', () => {
      expect(service.mapStatus('accepted')).toBe(PharmacyOrderStatus.CONFIRMED);
    });

    it('maps "confirmed" to CONFIRMED', () => {
      expect(service.mapStatus('confirmed')).toBe(
        PharmacyOrderStatus.CONFIRMED,
      );
    });

    it('maps "packed" to PACKED', () => {
      expect(service.mapStatus('packed')).toBe(PharmacyOrderStatus.PACKED);
    });

    it('maps "dispatched" to SHIPPED', () => {
      expect(service.mapStatus('dispatched')).toBe(PharmacyOrderStatus.SHIPPED);
    });

    it('maps "shipped" to SHIPPED', () => {
      expect(service.mapStatus('shipped')).toBe(PharmacyOrderStatus.SHIPPED);
    });

    it('maps "out_for_delivery" to OUT_FOR_DELIVERY', () => {
      expect(service.mapStatus('out_for_delivery')).toBe(
        PharmacyOrderStatus.OUT_FOR_DELIVERY,
      );
    });

    it('maps "delivered" to DELIVERED', () => {
      expect(service.mapStatus('delivered')).toBe(
        PharmacyOrderStatus.DELIVERED,
      );
    });

    it('maps "cancelled" to CANCELLED', () => {
      expect(service.mapStatus('cancelled')).toBe(
        PharmacyOrderStatus.CANCELLED,
      );
    });

    it('returns null for unknown status', () => {
      expect(service.mapStatus('unknown_status')).toBeNull();
    });

    it('is case-insensitive', () => {
      expect(service.mapStatus('ACCEPTED')).toBe(PharmacyOrderStatus.CONFIRMED);
      expect(service.mapStatus('Packed')).toBe(PharmacyOrderStatus.PACKED);
    });
  });

  // ---------------------------------------------------------------------------
  // Idempotency
  // ---------------------------------------------------------------------------

  describe('idempotency', () => {
    it('skips processing when order already at the same status', async () => {
      mockPrisma.pharmacyOrder.findFirst.mockResolvedValue({
        id: 'order-1',
        partnerOrderId: 'partner-order-1',
        status: PharmacyOrderStatus.CONFIRMED,
      });

      const result = await service.handleOrderStatusWebhook(
        'mock',
        'partner-order-1',
        'confirmed',
      );

      expect(result.processed).toBe(false);
      expect(result.message).toContain('already at status');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('skips processing when history entry already exists', async () => {
      mockPrisma.pharmacyOrder.findFirst.mockResolvedValue({
        id: 'order-1',
        partnerOrderId: 'partner-order-1',
        status: PharmacyOrderStatus.PACKED,
      });
      mockPrisma.pharmacyOrderStatusHistory.findUnique.mockResolvedValue({
        id: 'history-1',
        pharmacyOrderId: 'order-1',
        status: PharmacyOrderStatus.SHIPPED,
      });

      const result = await service.handleOrderStatusWebhook(
        'mock',
        'partner-order-1',
        'shipped',
      );

      expect(result.processed).toBe(false);
      expect(result.message).toContain('already recorded');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Webhook processing
  // ---------------------------------------------------------------------------

  describe('handleOrderStatusWebhook', () => {
    it('returns not processed for unknown status', async () => {
      const result = await service.handleOrderStatusWebhook(
        'mock',
        'partner-order-1',
        'unknown_status' as any,
      );

      expect(result.processed).toBe(false);
      expect(result.message).toContain('Unknown status');
    });

    it('returns not processed when order is not found', async () => {
      mockPrisma.pharmacyOrder.findFirst.mockResolvedValue(null);

      const result = await service.handleOrderStatusWebhook(
        'mock',
        'nonexistent-order',
        'confirmed',
      );

      expect(result.processed).toBe(false);
      expect(result.message).toContain('Order not found');
    });

    it('successfully processes a valid forward status transition', async () => {
      mockPrisma.pharmacyOrder.findFirst.mockResolvedValue({
        id: 'order-1',
        partnerOrderId: 'partner-order-1',
        status: PharmacyOrderStatus.PENDING,
        patientProfile: { userId: 'user-1' },
      });
      mockPrisma.pharmacyOrderStatusHistory.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockResolvedValue([]);
      mockNotifications.sendNotification.mockResolvedValue({});

      const result = await service.handleOrderStatusWebhook(
        'mock',
        'partner-order-1',
        'confirmed',
        '2026-04-20T05:00:00.000Z',
      );

      expect(result.processed).toBe(true);
      expect(result.status).toBe(PharmacyOrderStatus.CONFIRMED);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockNotifications.sendNotification).toHaveBeenCalledTimes(1);
    });

    it('rejects backward status transition', async () => {
      mockPrisma.pharmacyOrder.findFirst.mockResolvedValue({
        id: 'order-1',
        partnerOrderId: 'partner-order-1',
        status: PharmacyOrderStatus.SHIPPED,
      });

      const result = await service.handleOrderStatusWebhook(
        'mock',
        'partner-order-1',
        'packed',
      );

      expect(result.processed).toBe(false);
      expect(result.message).toContain('Invalid transition');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('allows CANCELLED status from any state', async () => {
      mockPrisma.pharmacyOrder.findFirst.mockResolvedValue({
        id: 'order-1',
        partnerOrderId: 'partner-order-1',
        status: PharmacyOrderStatus.SHIPPED,
        patientProfile: { userId: 'user-1' },
      });
      mockPrisma.pharmacyOrderStatusHistory.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockResolvedValue([]);
      mockNotifications.sendNotification.mockResolvedValue({});

      const result = await service.handleOrderStatusWebhook(
        'mock',
        'partner-order-1',
        'cancelled',
      );

      expect(result.processed).toBe(true);
      expect(result.status).toBe(PharmacyOrderStatus.CANCELLED);
    });

    it('falls back to logging when patient user is unavailable', async () => {
      mockPrisma.pharmacyOrder.findFirst.mockResolvedValue({
        id: 'order-1',
        partnerOrderId: 'partner-order-1',
        status: PharmacyOrderStatus.PENDING,
        patientProfile: null,
      });
      mockPrisma.pharmacyOrderStatusHistory.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockResolvedValue([]);

      const result = await service.handleOrderStatusWebhook(
        'mock',
        'partner-order-1',
        'confirmed',
      );

      expect(result.processed).toBe(true);
      expect(mockNotifications.sendNotification).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Event emission
  // ---------------------------------------------------------------------------

  describe('event emission', () => {
    it('calls registered listeners on status update', async () => {
      mockPrisma.pharmacyOrder.findFirst.mockResolvedValue({
        id: 'order-1',
        partnerOrderId: 'partner-order-1',
        status: PharmacyOrderStatus.PENDING,
      });
      mockPrisma.pharmacyOrderStatusHistory.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockResolvedValue([]);

      const listener = jest.fn();
      service.onStatusUpdated(listener);

      await service.handleOrderStatusWebhook(
        'mock',
        'partner-order-1',
        'confirmed',
      );

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          pharmacyOrderId: 'order-1',
          previousStatus: PharmacyOrderStatus.PENDING,
          newStatus: PharmacyOrderStatus.CONFIRMED,
          partnerCode: 'mock',
        }),
      );
    });

    it('unsubscribe stops notifications', async () => {
      mockPrisma.pharmacyOrder.findFirst.mockResolvedValue({
        id: 'order-1',
        partnerOrderId: 'partner-order-1',
        status: PharmacyOrderStatus.PENDING,
      });
      mockPrisma.pharmacyOrderStatusHistory.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockResolvedValue([]);

      const listener = jest.fn();
      const unsub = service.onStatusUpdated(listener);
      unsub();

      await service.handleOrderStatusWebhook(
        'mock',
        'partner-order-1',
        'confirmed',
      );

      expect(listener).not.toHaveBeenCalled();
    });
  });
});

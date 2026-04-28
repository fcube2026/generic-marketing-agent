import { PharmacyOrderStatus } from '@prisma/client';
import { PharmacyJobService } from './pharmacy-job.service';
import { PharmacyPartnerProvider } from '../providers/pharmacy-partner.interface';

describe('PharmacyJobService', () => {
  let service: PharmacyJobService;
  let mockPrisma: any;
  let mockProvider: jest.Mocked<PharmacyPartnerProvider>;

  beforeEach(() => {
    mockPrisma = {
      pharmacyOrder: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
      pharmacyOrderStatusHistory: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockResolvedValue([]),
    };

    mockProvider = {
      searchMedicines: jest.fn(),
      checkAvailability: jest.fn(),
      createOrder: jest.fn(),
      getOrderStatus: jest.fn(),
      cancelOrder: jest.fn(),
    };

    service = new PharmacyJobService(
      mockPrisma,
      new Map<string, PharmacyPartnerProvider>([['mock', mockProvider]]),
    );
  });

  // ---------------------------------------------------------------------------
  // pollOrderStatuses
  // ---------------------------------------------------------------------------

  describe('pollOrderStatuses', () => {
    it('returns zero counts when there are no active orders', async () => {
      mockPrisma.pharmacyOrder.findMany.mockResolvedValue([]);

      const result = await service.pollOrderStatuses();

      expect(result).toEqual({
        totalOrders: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
      });
    });

    it('updates order status when mock provider returns a new status', async () => {
      mockPrisma.pharmacyOrder.findMany.mockResolvedValue([
        {
          id: 'order-1',
          partnerOrderId: 'MOCK-ORD-1',
          status: PharmacyOrderStatus.PENDING,
          pharmacyPartner: { code: 'mock', name: 'Mock' },
        },
      ]);
      mockProvider.getOrderStatus.mockResolvedValue({
        partnerOrderId: 'MOCK-ORD-1',
        status: 'CONFIRMED',
      });

      const result = await service.pollOrderStatuses();

      expect(result.updated).toBe(1);
      expect(result.skipped).toBe(0);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('skips orders whose status has not changed', async () => {
      mockPrisma.pharmacyOrder.findMany.mockResolvedValue([
        {
          id: 'order-1',
          partnerOrderId: 'MOCK-ORD-1',
          status: PharmacyOrderStatus.CONFIRMED,
          pharmacyPartner: { code: 'mock', name: 'Mock' },
        },
      ]);
      mockProvider.getOrderStatus.mockResolvedValue({
        partnerOrderId: 'MOCK-ORD-1',
        status: 'CONFIRMED',
      });

      const result = await service.pollOrderStatuses();

      expect(result.skipped).toBe(1);
      expect(result.updated).toBe(0);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects backward status transitions', async () => {
      mockPrisma.pharmacyOrder.findMany.mockResolvedValue([
        {
          id: 'order-1',
          partnerOrderId: 'MOCK-ORD-1',
          status: PharmacyOrderStatus.SHIPPED,
          pharmacyPartner: { code: 'mock', name: 'Mock' },
        },
      ]);
      mockProvider.getOrderStatus.mockResolvedValue({
        partnerOrderId: 'MOCK-ORD-1',
        status: 'CONFIRMED', // backward from SHIPPED
      });

      const result = await service.pollOrderStatuses();

      expect(result.skipped).toBe(1);
      expect(result.updated).toBe(0);
    });

    it('counts errors when provider throws', async () => {
      mockPrisma.pharmacyOrder.findMany.mockResolvedValue([
        {
          id: 'order-1',
          partnerOrderId: 'MOCK-ORD-1',
          status: PharmacyOrderStatus.PENDING,
          pharmacyPartner: { code: 'mock', name: 'Mock' },
        },
      ]);
      mockProvider.getOrderStatus.mockRejectedValue(
        new Error('Simulated failure'),
      );

      const result = await service.pollOrderStatuses();

      expect(result.errors).toBe(1);
      expect(result.updated).toBe(0);
    });

    it('handles multiple orders with mixed results', async () => {
      mockPrisma.pharmacyOrder.findMany.mockResolvedValue([
        {
          id: 'order-1',
          partnerOrderId: 'MOCK-ORD-1',
          status: PharmacyOrderStatus.PENDING,
          pharmacyPartner: { code: 'mock', name: 'Mock' },
        },
        {
          id: 'order-2',
          partnerOrderId: 'MOCK-ORD-2',
          status: PharmacyOrderStatus.CONFIRMED,
          pharmacyPartner: { code: 'mock', name: 'Mock' },
        },
        {
          id: 'order-3',
          partnerOrderId: 'MOCK-ORD-3',
          status: PharmacyOrderStatus.PACKED,
          pharmacyPartner: { code: 'mock', name: 'Mock' },
        },
      ]);

      mockProvider.getOrderStatus
        .mockResolvedValueOnce({
          partnerOrderId: 'MOCK-ORD-1',
          status: 'CONFIRMED',
        })
        .mockResolvedValueOnce({
          partnerOrderId: 'MOCK-ORD-2',
          status: 'CONFIRMED', // same status → skip
        })
        .mockRejectedValueOnce(new Error('Timeout'));

      const result = await service.pollOrderStatuses();

      expect(result.totalOrders).toBe(3);
      expect(result.updated).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // updateOrderStatus (idempotency)
  // ---------------------------------------------------------------------------

  describe('updateOrderStatus', () => {
    it('skips update when history entry already exists', async () => {
      mockPrisma.pharmacyOrderStatusHistory.findUnique.mockResolvedValue({
        id: 'history-1',
      });

      await service.updateOrderStatus('order-1', PharmacyOrderStatus.CONFIRMED);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('creates transaction for new status updates', async () => {
      mockPrisma.pharmacyOrderStatusHistory.findUnique.mockResolvedValue(null);

      await service.updateOrderStatus('order-1', PharmacyOrderStatus.CONFIRMED);

      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        expect.arrayContaining([expect.anything(), expect.anything()]),
      );
    });

    it('sets deliveredAt when status transitions to DELIVERED', async () => {
      mockPrisma.pharmacyOrderStatusHistory.findUnique.mockResolvedValue(null);

      await service.updateOrderStatus('order-1', PharmacyOrderStatus.DELIVERED);

      expect(mockPrisma.pharmacyOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PharmacyOrderStatus.DELIVERED,
            deliveredAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // calculateRefillReminderDate
  // ---------------------------------------------------------------------------

  describe('calculateRefillReminderDate', () => {
    it('calculates correct refill and reminder dates', () => {
      const deliveredAt = new Date('2026-04-01T00:00:00Z');

      const result = service.calculateRefillReminderDate(deliveredAt, 30, 3);

      expect(result.refillDate.toISOString()).toBe('2026-05-01T00:00:00.000Z');
      expect(result.reminderDate.toISOString()).toBe(
        '2026-04-28T00:00:00.000Z',
      );
    });

    it('handles short prescription durations', () => {
      const deliveredAt = new Date('2026-04-15T12:00:00Z');

      const result = service.calculateRefillReminderDate(deliveredAt, 7, 2);

      expect(result.refillDate.toISOString()).toBe('2026-04-22T12:00:00.000Z');
      expect(result.reminderDate.toISOString()).toBe(
        '2026-04-20T12:00:00.000Z',
      );
    });

    it('handles reminder days larger than prescription duration', () => {
      const deliveredAt = new Date('2026-04-01T00:00:00Z');

      const result = service.calculateRefillReminderDate(deliveredAt, 5, 10);

      // Reminder date is before delivery date in this edge case
      expect(result.refillDate.toISOString()).toBe('2026-04-06T00:00:00.000Z');
      expect(result.reminderDate.toISOString()).toBe(
        '2026-03-27T00:00:00.000Z',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getMockOrderStatus
  // ---------------------------------------------------------------------------

  describe('getMockOrderStatus', () => {
    it('returns status from mock provider', async () => {
      mockProvider.getOrderStatus.mockResolvedValue({
        partnerOrderId: 'MOCK-ORD-1',
        status: 'PACKED',
      });

      const status = await service.getMockOrderStatus('MOCK-ORD-1');

      expect(status).toBe('PACKED');
    });

    it('returns null when no mock provider is registered', async () => {
      const serviceWithoutMock = new PharmacyJobService(
        mockPrisma,
        new Map<string, PharmacyPartnerProvider>(),
      );

      const status = await serviceWithoutMock.getMockOrderStatus('MOCK-ORD-1');

      expect(status).toBeNull();
    });

    it('throws when provider throws', async () => {
      mockProvider.getOrderStatus.mockRejectedValue(new Error('Network error'));

      await expect(service.getMockOrderStatus('MOCK-ORD-1')).rejects.toThrow(
        'Network error',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getProviderOrderStatus (per-partner routing)
  // ---------------------------------------------------------------------------

  describe('getProviderOrderStatus', () => {
    it('routes to the matching partner provider by code', async () => {
      const partnerProvider: jest.Mocked<PharmacyPartnerProvider> = {
        ...mockProvider,
        getOrderStatus: jest.fn().mockResolvedValue({
          partnerOrderId: 'ORD-1',
          status: 'SHIPPED',
        }),
      };

      const serviceWithPartner = new PharmacyJobService(
        mockPrisma,
        new Map<string, PharmacyPartnerProvider>([
          ['mock', mockProvider],
          ['demo-pharmacy', partnerProvider],
        ]),
      );

      const status = await serviceWithPartner.getProviderOrderStatus(
        'demo-pharmacy',
        'Demo Pharmacy',
        'ORD-1',
      );

      expect(status).toBe('SHIPPED');
      expect(partnerProvider.getOrderStatus).toHaveBeenCalledWith('ORD-1');
      expect(mockProvider.getOrderStatus).not.toHaveBeenCalled();
    });

    it('falls back to mock provider when partner code is not registered', async () => {
      mockProvider.getOrderStatus.mockResolvedValue({
        partnerOrderId: 'ORD-1',
        status: 'CONFIRMED',
      });

      const status = await service.getProviderOrderStatus(
        'unknown-partner',
        'Unknown',
        'ORD-1',
      );

      expect(status).toBe('CONFIRMED');
      expect(mockProvider.getOrderStatus).toHaveBeenCalledWith('ORD-1');
    });

    it('returns null when no provider is registered at all', async () => {
      const emptyService = new PharmacyJobService(
        mockPrisma,
        new Map<string, PharmacyPartnerProvider>(),
      );

      const status = await emptyService.getProviderOrderStatus(
        'any',
        'any',
        'ORD-1',
      );

      expect(status).toBeNull();
    });

    it('throws when the resolved provider throws', async () => {
      mockProvider.getOrderStatus.mockRejectedValue(new Error('Timeout'));

      await expect(
        service.getProviderOrderStatus('unknown', 'unknown', 'ORD-1'),
      ).rejects.toThrow('Timeout');
    });
  });

  // ---------------------------------------------------------------------------
  // pollOrderStatuses — per-partner routing
  // ---------------------------------------------------------------------------

  describe('pollOrderStatuses (per-partner routing)', () => {
    it('routes polling to the correct provider for each order', async () => {
      const demoProvider: jest.Mocked<PharmacyPartnerProvider> = {
        ...mockProvider,
        getOrderStatus: jest.fn().mockResolvedValue({
          partnerOrderId: 'ORD-DEMO',
          status: 'SHIPPED',
        }),
      };

      const serviceWithMultiple = new PharmacyJobService(
        mockPrisma,
        new Map<string, PharmacyPartnerProvider>([
          ['mock', mockProvider],
          ['demo-pharmacy', demoProvider],
        ]),
      );

      mockPrisma.pharmacyOrder.findMany.mockResolvedValue([
        {
          id: 'order-mock',
          partnerOrderId: 'ORD-MOCK',
          status: PharmacyOrderStatus.PENDING,
          pharmacyPartner: { code: 'mock', name: 'Mock' },
        },
        {
          id: 'order-demo',
          partnerOrderId: 'ORD-DEMO',
          status: PharmacyOrderStatus.CONFIRMED,
          pharmacyPartner: { code: 'demo-pharmacy', name: 'Demo Pharmacy' },
        },
      ]);

      mockProvider.getOrderStatus.mockResolvedValue({
        partnerOrderId: 'ORD-MOCK',
        status: 'CONFIRMED',
      });

      const result = await serviceWithMultiple.pollOrderStatuses();

      expect(mockProvider.getOrderStatus).toHaveBeenCalledWith('ORD-MOCK');
      expect(demoProvider.getOrderStatus).toHaveBeenCalledWith('ORD-DEMO');
      expect(result.updated).toBe(2); // mock: PENDING→CONFIRMED; demo: CONFIRMED→SHIPPED
      expect(result.skipped).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // scheduleRefillOnDelivery
  // ---------------------------------------------------------------------------

  describe('scheduleRefillOnDelivery', () => {
    it('is a no-op when no scheduler is injected', async () => {
      // service has no scheduler (default)
      await expect(
        service.scheduleRefillOnDelivery('order-1', new Date()),
      ).resolves.not.toThrow();
    });

    it('calls scheduleRefillReminder on the scheduler with correct args', async () => {
      const mockScheduler = {
        scheduleRefillReminder: jest.fn().mockResolvedValue(undefined),
      };

      const serviceWithScheduler = new PharmacyJobService(
        {
          ...mockPrisma,
          pharmacyOrder: {
            ...mockPrisma.pharmacyOrder,
            findUnique: jest.fn().mockResolvedValue({
              orderNumber: 'PHARM-TESTXYZ',
              patientProfileId: 'patient-1',
            }),
          },
        },
        new Map<string, PharmacyPartnerProvider>([['mock', mockProvider]]),
        mockScheduler,
      );

      const deliveredAt = new Date('2026-04-23T00:00:00Z');
      await serviceWithScheduler.scheduleRefillOnDelivery(
        'order-1',
        deliveredAt,
      );

      expect(mockScheduler.scheduleRefillReminder).toHaveBeenCalledWith(
        'order-1',
        'PHARM-TESTXYZ',
        'patient-1',
        deliveredAt,
      );
    });

    it('does not throw when order is not found', async () => {
      const mockScheduler = {
        scheduleRefillReminder: jest.fn(),
      };

      const serviceWithScheduler = new PharmacyJobService(
        {
          ...mockPrisma,
          pharmacyOrder: {
            ...mockPrisma.pharmacyOrder,
            findUnique: jest.fn().mockResolvedValue(null),
          },
        },
        new Map<string, PharmacyPartnerProvider>([['mock', mockProvider]]),
        mockScheduler,
      );

      await expect(
        serviceWithScheduler.scheduleRefillOnDelivery(
          'missing-order',
          new Date(),
        ),
      ).resolves.not.toThrow();

      expect(mockScheduler.scheduleRefillReminder).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // updateOrderStatus triggers refill on DELIVERED
  // ---------------------------------------------------------------------------

  describe('updateOrderStatus triggers refill on DELIVERED', () => {
    it('calls scheduleRefillOnDelivery after transitioning to DELIVERED', async () => {
      mockPrisma.pharmacyOrderStatusHistory.findUnique.mockResolvedValue(null);

      const mockScheduler = {
        scheduleRefillReminder: jest.fn().mockResolvedValue(undefined),
      };

      const findUniqueMock = jest.fn().mockResolvedValue({
        orderNumber: 'PHARM-DEL-1',
        patientProfileId: 'patient-1',
      });

      const serviceWithScheduler = new PharmacyJobService(
        {
          ...mockPrisma,
          pharmacyOrder: {
            ...mockPrisma.pharmacyOrder,
            findUnique: findUniqueMock,
          },
        },
        new Map<string, PharmacyPartnerProvider>([['mock', mockProvider]]),
        mockScheduler,
      );

      await serviceWithScheduler.updateOrderStatus(
        'order-1',
        PharmacyOrderStatus.DELIVERED,
      );

      expect(mockScheduler.scheduleRefillReminder).toHaveBeenCalledWith(
        'order-1',
        'PHARM-DEL-1',
        'patient-1',
        expect.any(Date),
      );
    });

    it('does not call scheduleRefillOnDelivery for non-DELIVERED statuses', async () => {
      mockPrisma.pharmacyOrderStatusHistory.findUnique.mockResolvedValue(null);

      const mockScheduler = {
        scheduleRefillReminder: jest.fn(),
      };

      const serviceWithScheduler = new PharmacyJobService(
        mockPrisma,
        new Map<string, PharmacyPartnerProvider>([['mock', mockProvider]]),
        mockScheduler,
      );

      await serviceWithScheduler.updateOrderStatus(
        'order-1',
        PharmacyOrderStatus.CONFIRMED,
      );

      expect(mockScheduler.scheduleRefillReminder).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // sendNotification
  // ---------------------------------------------------------------------------

  describe('sendNotification', () => {
    it('logs a notification without throwing', async () => {
      await expect(
        service.sendNotification({
          orderId: 'order-1',
          patientProfileId: 'patient-1',
          orderNumber: 'PHARM-TEST123',
          deliveredAt: new Date('2026-04-01'),
          refillDate: new Date('2026-05-01'),
          reminderDate: new Date('2026-04-28'),
          isFollowup: false,
        }),
      ).resolves.not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Reminder deduplication
  // ---------------------------------------------------------------------------

  describe('hasReminderBeenSent', () => {
    it('returns false when no record exists', async () => {
      mockPrisma.pharmacyOrderStatusHistory.findFirst.mockResolvedValue(null);

      const result = await service.hasReminderBeenSent('order-1', false);

      expect(result).toBe(false);
    });

    it('returns true when record exists', async () => {
      mockPrisma.pharmacyOrderStatusHistory.findFirst.mockResolvedValue({
        id: 'hist-1',
      });

      const result = await service.hasReminderBeenSent('order-1', false);

      expect(result).toBe(true);
    });

    it('uses different source for followup reminders', async () => {
      await service.hasReminderBeenSent('order-1', true);

      expect(
        mockPrisma.pharmacyOrderStatusHistory.findFirst,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            source: 'refill-reminder:followup',
          }),
        }),
      );
    });
  });

  describe('recordReminderSent', () => {
    it('creates a history record when none exists', async () => {
      mockPrisma.pharmacyOrderStatusHistory.findFirst.mockResolvedValue(null);

      await service.recordReminderSent('order-1', false);

      expect(mockPrisma.pharmacyOrderStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pharmacyOrderId: 'order-1',
            source: 'refill-reminder:initial',
          }),
        }),
      );
    });

    it('does not create duplicate records', async () => {
      mockPrisma.pharmacyOrderStatusHistory.findFirst.mockResolvedValue({
        id: 'hist-1',
      });

      await service.recordReminderSent('order-1', false);

      expect(
        mockPrisma.pharmacyOrderStatusHistory.create,
      ).not.toHaveBeenCalled();
    });
  });
});

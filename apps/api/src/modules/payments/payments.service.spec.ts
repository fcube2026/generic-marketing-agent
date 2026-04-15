import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockPrisma = {
    booking: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payout: {
      upsert: jest.fn(),
    },
  };

  const mockNotificationsService = {
    sendNotification: jest.fn().mockResolvedValue({
      inAppId: 'notif-1',
      pushSent: true,
      smsSent: true,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initiatePayment', () => {
    const dto = { bookingId: 'booking-1', amount: 500 };

    it('should create a PENDING payment for a valid booking', async () => {
      const mockBooking = { id: 'booking-1', totalFee: 500 };
      const mockPayment = {
        id: 'payment-1',
        bookingId: 'booking-1',
        amount: 500,
        status: 'PENDING',
        transactionId: 'TXN_123',
      };

      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.payment.create.mockResolvedValue(mockPayment);

      const result = await service.initiatePayment(dto, 'user-1');

      expect(result).toEqual(mockPayment);
      expect(result.status).toBe('PENDING');
      expect(mockPrisma.booking.findUnique).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
      });
      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookingId: 'booking-1',
          amount: 500,
          status: 'PENDING',
          transactionId: expect.stringContaining('TXN_'),
        }),
      });
    });

    it('should return existing payment if one already exists', async () => {
      const mockBooking = { id: 'booking-1', totalFee: 500 };
      const existingPayment = {
        id: 'payment-1',
        bookingId: 'booking-1',
        amount: 500,
        status: 'PENDING',
      };

      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.payment.findUnique.mockResolvedValue(existingPayment);

      const result = await service.initiatePayment(dto, 'user-1');

      expect(result).toEqual(existingPayment);
      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if booking does not exist', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      await expect(service.initiatePayment(dto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    });
  });

  describe('getPaymentStatus', () => {
    it('should return payment details for a valid booking', async () => {
      const mockPayment = {
        id: 'payment-1',
        bookingId: 'booking-1',
        amount: 500,
        status: 'PENDING',
      };

      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);

      const result = await service.getPaymentStatus('booking-1', 'user-1');

      expect(result).toEqual(mockPayment);
      expect(mockPrisma.payment.findUnique).toHaveBeenCalledWith({
        where: { bookingId: 'booking-1' },
      });
    });

    it('should throw NotFoundException if payment not found', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.getPaymentStatus('unknown', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePaymentStatus', () => {
    const paymentId = 'payment-1';

    it('should mark payment as PAID and update booking paymentStatus', async () => {
      const mockPayment = {
        id: 'payment-1',
        bookingId: 'booking-1',
        amount: 500,
        status: 'PENDING',
      };
      const updatedPayment = {
        ...mockPayment,
        status: 'PAID',
        transactionId: 'TXN_456',
        paidAt: expect.any(Date),
      };
      const mockBooking = {
        id: 'booking-1',
        providerId: 'provider-1',
        totalFee: 1000,
        patient: { userId: 'patient-user-1' },
        provider: { userId: 'provider-user-1' },
      };

      mockPrisma.payment.findUnique.mockResolvedValueOnce(mockPayment);
      mockPrisma.payment.update.mockResolvedValue(updatedPayment);
      mockPrisma.booking.update.mockResolvedValue({});
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.payout.upsert.mockResolvedValue({});

      const result = await service.updatePaymentStatus(
        paymentId,
        {
          status: 'PAID',
          transactionId: 'TXN_456',
        },
        'user-1',
      );

      expect(result.status).toBe('PAID');
      // Verify booking paymentStatus updated to PAID
      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: { paymentStatus: 'PAID' },
      });
      // Verify payout created at 80% of total fee
      expect(mockPrisma.payout.upsert).toHaveBeenCalledWith({
        where: { bookingId: 'booking-1' },
        create: {
          providerId: 'provider-1',
          bookingId: 'booking-1',
          amount: 800,
          status: 'PENDING',
        },
        update: { amount: 800 },
      });
      // Verify notifications sent
      expect(mockNotificationsService.sendNotification).toHaveBeenCalled();
    });

    it('should update booking paymentStatus when status is REFUNDED', async () => {
      const mockPayment = {
        id: 'payment-1',
        bookingId: 'booking-1',
        amount: 500,
        status: 'PAID',
      };
      const updatedPayment = { ...mockPayment, status: 'REFUNDED' };
      const mockBooking = {
        id: 'booking-1',
        patient: { userId: 'patient-user-1' },
        provider: { userId: 'provider-user-1' },
      };

      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrisma.payment.update.mockResolvedValue(updatedPayment);
      mockPrisma.booking.update.mockResolvedValue({});
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);

      const result = await service.updatePaymentStatus(
        paymentId,
        {
          status: 'REFUNDED',
        },
        'user-1',
      );

      expect(result.status).toBe('REFUNDED');
      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: { paymentStatus: 'REFUNDED' },
      });
      expect(mockPrisma.payout.upsert).not.toHaveBeenCalled();
    });

    it('should update booking paymentStatus when status is FAILED', async () => {
      const mockPayment = {
        id: 'payment-1',
        bookingId: 'booking-1',
        amount: 500,
        status: 'PENDING',
      };
      const updatedPayment = { ...mockPayment, status: 'FAILED' };

      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrisma.payment.update.mockResolvedValue(updatedPayment);
      mockPrisma.booking.update.mockResolvedValue({});
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      const result = await service.updatePaymentStatus(
        paymentId,
        {
          status: 'FAILED',
        },
        'user-1',
      );

      expect(result.status).toBe('FAILED');
      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: { paymentStatus: 'FAILED' },
      });
      expect(mockPrisma.payout.upsert).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if payment not found', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePaymentStatus('unknown', { status: 'PAID' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

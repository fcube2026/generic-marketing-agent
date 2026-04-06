import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('BookingsService', () => {
  let service: BookingsService;

  const mockPrisma = {
    patientProfile: {
      findUnique: jest.fn(),
    },
    providerProfile: {
      findUnique: jest.fn(),
    },
    booking: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    bookingStatusHistory: {
      create: jest.fn(),
    },
    payment: {
      create: jest.fn(),
    },
    consultationSummary: {
      findUnique: jest.fn(),
    },
  };

  const mockNotifications = {
    createNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBooking', () => {
    const userId = 'user-1';
    const dto = {
      providerId: 'provider-1',
      serviceCategoryId: 'cat-1',
      mode: 'HOME_VISIT' as const,
      scheduledAt: '2025-01-01T10:00:00Z',
      symptoms: 'Headache',
    };

    it('should create booking and notify provider', async () => {
      const patient = { id: 'patient-1', userId };
      const provider = {
        id: 'provider-1',
        userId: 'provider-user-1',
        consultationFeeHomeVisit: 500,
        consultationFeeDoctorPlace: 300,
      };
      const booking = {
        id: 'booking-1',
        ...dto,
        patientId: patient.id,
        totalFee: 500,
        status: 'REQUESTED',
        provider,
        serviceCategory: { id: 'cat-1', name: 'General' },
        address: null,
      };

      mockPrisma.patientProfile.findUnique.mockResolvedValue(patient);
      mockPrisma.providerProfile.findUnique.mockResolvedValue(provider);
      mockPrisma.booking.create.mockResolvedValue(booking);
      mockPrisma.bookingStatusHistory.create.mockResolvedValue({});
      mockPrisma.payment.create.mockResolvedValue({});
      mockNotifications.createNotification.mockResolvedValue({});

      const result = await service.createBooking(userId, dto);

      expect(result).toEqual(booking);
      expect(mockNotifications.createNotification).toHaveBeenCalledWith({
        userId: 'provider-user-1',
        title: 'New Booking Request',
        message: 'You have a new home visit booking request.',
        type: 'BOOKING_REQUEST',
        metadata: { bookingId: 'booking-1' },
      });
    });

    it('should throw if patient profile not found', async () => {
      mockPrisma.patientProfile.findUnique.mockResolvedValue(null);
      await expect(service.createBooking(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if provider not found', async () => {
      mockPrisma.patientProfile.findUnique.mockResolvedValue({
        id: 'patient-1',
        userId,
      });
      mockPrisma.providerProfile.findUnique.mockResolvedValue(null);
      await expect(service.createBooking(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('acceptBooking', () => {
    it('should accept a REQUESTED booking and notify patient', async () => {
      const booking = {
        id: 'booking-1',
        status: 'REQUESTED',
        patientId: 'patient-1',
        providerId: 'provider-1',
      };
      const updated = { ...booking, status: 'ACCEPTED' };
      const bookingWithRelations = {
        ...booking,
        patient: { id: 'patient-1', userId: 'patient-user-1', name: 'John' },
        provider: { id: 'provider-1', name: 'Dr. Smith' },
      };

      mockPrisma.booking.findUnique
        .mockResolvedValueOnce(booking) // for updateBookingStatus
        .mockResolvedValueOnce(bookingWithRelations); // for notification lookup
      mockPrisma.booking.update.mockResolvedValue(updated);
      mockPrisma.bookingStatusHistory.create.mockResolvedValue({});
      mockNotifications.createNotification.mockResolvedValue({});

      const result = await service.acceptBooking('booking-1', 'user-1');

      expect(result).toEqual(updated);
      expect(mockNotifications.createNotification).toHaveBeenCalledWith({
        userId: 'patient-user-1',
        title: 'Booking Accepted',
        message: 'Your booking has been accepted by Dr. Smith.',
        type: 'BOOKING_ACCEPTED',
        metadata: { bookingId: 'booking-1' },
      });
    });
  });

  describe('declineBooking', () => {
    it('should decline a REQUESTED booking and notify patient', async () => {
      const booking = {
        id: 'booking-1',
        status: 'REQUESTED',
        patientId: 'patient-1',
        providerId: 'provider-1',
      };
      const updated = { ...booking, status: 'DECLINED' };
      const bookingWithRelations = {
        ...booking,
        patient: { id: 'patient-1', userId: 'patient-user-1', name: 'John' },
        provider: { id: 'provider-1', name: 'Dr. Smith' },
      };

      mockPrisma.booking.findUnique
        .mockResolvedValueOnce(booking)
        .mockResolvedValueOnce(bookingWithRelations);
      mockPrisma.booking.update.mockResolvedValue(updated);
      mockPrisma.bookingStatusHistory.create.mockResolvedValue({});
      mockNotifications.createNotification.mockResolvedValue({});

      const result = await service.declineBooking(
        'booking-1',
        'user-1',
        'Not available',
      );

      expect(result).toEqual(updated);
      expect(mockNotifications.createNotification).toHaveBeenCalledWith({
        userId: 'patient-user-1',
        title: 'Booking Declined',
        message:
          'Your booking was declined by Dr. Smith. Reason: Not available',
        type: 'BOOKING_DECLINED',
        metadata: { bookingId: 'booking-1', reason: 'Not available' },
      });
    });

    it('should decline without reason', async () => {
      const booking = {
        id: 'booking-1',
        status: 'REQUESTED',
        patientId: 'patient-1',
        providerId: 'provider-1',
      };
      const updated = { ...booking, status: 'DECLINED' };
      const bookingWithRelations = {
        ...booking,
        patient: { id: 'patient-1', userId: 'patient-user-1', name: 'John' },
        provider: { id: 'provider-1', name: 'Dr. Smith' },
      };

      mockPrisma.booking.findUnique
        .mockResolvedValueOnce(booking)
        .mockResolvedValueOnce(bookingWithRelations);
      mockPrisma.booking.update.mockResolvedValue(updated);
      mockPrisma.bookingStatusHistory.create.mockResolvedValue({});
      mockNotifications.createNotification.mockResolvedValue({});

      const result = await service.declineBooking('booking-1', 'user-1');

      expect(result).toEqual(updated);
      expect(mockNotifications.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Your booking was declined by Dr. Smith.',
        }),
      );
    });

    it('should throw if booking is not in REQUESTED status', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        status: 'ACCEPTED',
      });

      await expect(
        service.declineBooking('booking-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateBookingStatus', () => {
    it('should throw if booking not found', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);
      await expect(
        service.updateBookingStatus('booking-1', 'user-1', {
          status: 'ACCEPTED' as any,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw on invalid transition', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        status: 'COMPLETED',
      });
      await expect(
        service.updateBookingStatus('booking-1', 'user-1', {
          status: 'ACCEPTED' as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelBooking', () => {
    it('should cancel a REQUESTED booking', async () => {
      const booking = { id: 'booking-1', status: 'REQUESTED' };
      const updated = { ...booking, status: 'CANCELLED' };

      mockPrisma.booking.findUnique.mockResolvedValue(booking);
      mockPrisma.booking.update.mockResolvedValue(updated);
      mockPrisma.bookingStatusHistory.create.mockResolvedValue({});

      const result = await service.cancelBooking('booking-1', 'user-1');
      expect(result).toEqual(updated);
    });
  });
});

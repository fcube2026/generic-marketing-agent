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
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    bookingStatusHistory: {
      create: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      update: jest.fn(),
    },
    consultationSummary: {
      findUnique: jest.fn(),
    },
    address: {
      findFirst: jest.fn(),
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
      addressId: 'address-1',
      mode: 'HOME_VISIT' as const,
      scheduledAt: '2025-01-01T10:00:00Z',
      symptoms: 'Headache',
    };

    const patient = { id: 'patient-1', userId };
    const provider = {
      id: 'provider-1',
      userId: 'provider-user-1',
      isAvailable: true,
      homeVisitEnabled: true,
      doctorPlaceVisitEnabled: true,
      consultationFeeHomeVisit: 500,
      consultationFeeDoctorPlace: 300,
    };

    it('should create booking and notify provider', async () => {
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
      mockPrisma.address.findFirst.mockResolvedValue({
        id: 'address-1',
        userId,
      });
      mockPrisma.booking.findFirst.mockResolvedValue(null);
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
      mockPrisma.patientProfile.findUnique.mockResolvedValue(patient);
      mockPrisma.providerProfile.findUnique.mockResolvedValue(null);
      await expect(service.createBooking(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if provider is not available', async () => {
      mockPrisma.patientProfile.findUnique.mockResolvedValue(patient);
      mockPrisma.providerProfile.findUnique.mockResolvedValue({
        ...provider,
        isAvailable: false,
      });
      await expect(service.createBooking(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if home visit not enabled for provider', async () => {
      mockPrisma.patientProfile.findUnique.mockResolvedValue(patient);
      mockPrisma.providerProfile.findUnique.mockResolvedValue({
        ...provider,
        homeVisitEnabled: false,
      });
      await expect(service.createBooking(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if clinic visit not enabled for provider', async () => {
      mockPrisma.patientProfile.findUnique.mockResolvedValue(patient);
      mockPrisma.providerProfile.findUnique.mockResolvedValue({
        ...provider,
        doctorPlaceVisitEnabled: false,
      });
      const clinicDto = { ...dto, mode: 'DOCTOR_PLACE' as const };
      await expect(service.createBooking(userId, clinicDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if address missing for home visit', async () => {
      mockPrisma.patientProfile.findUnique.mockResolvedValue(patient);
      mockPrisma.providerProfile.findUnique.mockResolvedValue(provider);
      const noAddrDto = { ...dto, addressId: undefined };
      await expect(service.createBooking(userId, noAddrDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if address not found or not owned by user', async () => {
      mockPrisma.patientProfile.findUnique.mockResolvedValue(patient);
      mockPrisma.providerProfile.findUnique.mockResolvedValue(provider);
      mockPrisma.address.findFirst.mockResolvedValue(null);
      await expect(service.createBooking(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if provider has a conflicting booking', async () => {
      mockPrisma.patientProfile.findUnique.mockResolvedValue(patient);
      mockPrisma.providerProfile.findUnique.mockResolvedValue(provider);
      mockPrisma.address.findFirst.mockResolvedValue({
        id: 'address-1',
        userId,
      });
      mockPrisma.booking.findFirst.mockResolvedValue({
        id: 'existing-booking',
        status: 'ACCEPTED',
      });
      await expect(service.createBooking(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow clinic visit without addressId', async () => {
      const clinicDto = {
        ...dto,
        mode: 'DOCTOR_PLACE' as const,
        addressId: undefined,
      };
      const booking = {
        id: 'booking-2',
        ...clinicDto,
        patientId: patient.id,
        totalFee: 300,
        status: 'REQUESTED',
        provider,
        serviceCategory: { id: 'cat-1', name: 'General' },
        address: null,
      };

      mockPrisma.patientProfile.findUnique.mockResolvedValue(patient);
      mockPrisma.providerProfile.findUnique.mockResolvedValue(provider);
      mockPrisma.booking.findFirst.mockResolvedValue(null);
      mockPrisma.booking.create.mockResolvedValue(booking);
      mockPrisma.bookingStatusHistory.create.mockResolvedValue({});
      mockPrisma.payment.create.mockResolvedValue({});
      mockNotifications.createNotification.mockResolvedValue({});

      const result = await service.createBooking(userId, clinicDto);
      expect(result).toEqual(booking);
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
      const bookingWithRelations = {
        ...booking,
        patient: { id: 'patient-1', userId: 'patient-user-1' },
        provider: { id: 'provider-1', userId: 'provider-user-1' },
      };

      mockPrisma.booking.findUnique
        .mockResolvedValueOnce(booking) // for updateBookingStatus
        .mockResolvedValueOnce(bookingWithRelations); // for cancel notification lookup
      mockPrisma.booking.update.mockResolvedValue(updated);
      mockPrisma.bookingStatusHistory.create.mockResolvedValue({});
      mockNotifications.createNotification.mockResolvedValue({});

      const result = await service.cancelBooking('booking-1', 'patient-user-1');
      expect(result).toEqual(updated);
      expect(mockNotifications.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'provider-user-1',
          title: 'Booking Cancelled',
          type: 'BOOKING_CANCELLED',
        }),
      );
    });

    it('should cancel an ACCEPTED booking and notify patient when provider cancels', async () => {
      const booking = { id: 'booking-1', status: 'ACCEPTED' };
      const updated = { ...booking, status: 'CANCELLED' };
      const bookingWithRelations = {
        ...booking,
        patient: { id: 'patient-1', userId: 'patient-user-1' },
        provider: { id: 'provider-1', userId: 'provider-user-1' },
      };

      mockPrisma.booking.findUnique
        .mockResolvedValueOnce(booking)
        .mockResolvedValueOnce(bookingWithRelations);
      mockPrisma.booking.update.mockResolvedValue(updated);
      mockPrisma.bookingStatusHistory.create.mockResolvedValue({});
      mockNotifications.createNotification.mockResolvedValue({});

      const result = await service.cancelBooking(
        'booking-1',
        'provider-user-1',
      );
      expect(result).toEqual(updated);
      expect(mockNotifications.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'patient-user-1',
          title: 'Booking Cancelled',
        }),
      );
    });

    it('should reject cancel from ON_THE_WAY status', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        status: 'ON_THE_WAY',
      });
      await expect(
        service.cancelBooking('booking-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject cancel from IN_PROGRESS status', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        status: 'IN_PROGRESS',
      });
      await expect(
        service.cancelBooking('booking-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should trigger refund when cancelling a booking with PAID payment', async () => {
      const booking = { id: 'booking-1', status: 'ACCEPTED' };
      const updated = { ...booking, status: 'CANCELLED' };
      const bookingWithRelations = {
        ...booking,
        patient: { id: 'patient-1', userId: 'patient-user-1' },
        provider: { id: 'provider-1', userId: 'provider-user-1' },
        payment: { id: 'payment-1', status: 'PAID', amount: 500 },
      };

      mockPrisma.booking.findUnique
        .mockResolvedValueOnce(booking) // for updateBookingStatus
        .mockResolvedValueOnce(bookingWithRelations); // for cancel with payment lookup
      mockPrisma.booking.update.mockResolvedValue(updated);
      mockPrisma.bookingStatusHistory.create.mockResolvedValue({});
      mockNotifications.createNotification.mockResolvedValue({});
      mockPrisma.payment.update.mockResolvedValue({
        id: 'payment-1',
        status: 'REFUNDED',
      });

      await service.cancelBooking('booking-1', 'patient-user-1');

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: { status: 'REFUNDED' },
      });
      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: { paymentStatus: 'REFUNDED' },
      });
    });

    it('should not trigger refund when cancelling a booking with PENDING payment', async () => {
      const booking = { id: 'booking-1', status: 'REQUESTED' };
      const updated = { ...booking, status: 'CANCELLED' };
      const bookingWithRelations = {
        ...booking,
        patient: { id: 'patient-1', userId: 'patient-user-1' },
        provider: { id: 'provider-1', userId: 'provider-user-1' },
        payment: { id: 'payment-1', status: 'PENDING', amount: 500 },
      };

      mockPrisma.booking.findUnique
        .mockResolvedValueOnce(booking)
        .mockResolvedValueOnce(bookingWithRelations);
      mockPrisma.booking.update.mockResolvedValue(updated);
      mockPrisma.bookingStatusHistory.create.mockResolvedValue({});
      mockNotifications.createNotification.mockResolvedValue({});

      await service.cancelBooking('booking-1', 'patient-user-1');

      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
    });

    it('should not trigger refund when cancelling a booking with no payment', async () => {
      const booking = { id: 'booking-1', status: 'REQUESTED' };
      const updated = { ...booking, status: 'CANCELLED' };
      const bookingWithRelations = {
        ...booking,
        patient: { id: 'patient-1', userId: 'patient-user-1' },
        provider: { id: 'provider-1', userId: 'provider-user-1' },
        payment: null,
      };

      mockPrisma.booking.findUnique
        .mockResolvedValueOnce(booking)
        .mockResolvedValueOnce(bookingWithRelations);
      mockPrisma.booking.update.mockResolvedValue(updated);
      mockPrisma.bookingStatusHistory.create.mockResolvedValue({});
      mockNotifications.createNotification.mockResolvedValue({});

      await service.cancelBooking('booking-1', 'patient-user-1');

      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
    });
  });

  describe('full lifecycle transitions', () => {
    const setupTransition = (fromStatus: string) => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        status: fromStatus,
      });
      mockPrisma.booking.update.mockImplementation(({ data }) => ({
        id: 'booking-1',
        status: data.status,
      }));
      mockPrisma.bookingStatusHistory.create.mockResolvedValue({});
      mockNotifications.createNotification.mockResolvedValue({});
    };

    it('should transition ACCEPTED → ON_THE_WAY and notify patient', async () => {
      const booking = { id: 'booking-1', status: 'ACCEPTED' };
      const bookingWithPatient = {
        ...booking,
        patient: { id: 'patient-1', userId: 'patient-user-1' },
      };

      mockPrisma.booking.findUnique
        .mockResolvedValueOnce(booking) // for status check
        .mockResolvedValueOnce(bookingWithPatient); // for notification
      mockPrisma.booking.update.mockResolvedValue({
        ...booking,
        status: 'ON_THE_WAY',
      });
      mockPrisma.bookingStatusHistory.create.mockResolvedValue({});
      mockNotifications.createNotification.mockResolvedValue({});

      await service.updateBookingStatus('booking-1', 'user-1', {
        status: 'ON_THE_WAY' as any,
      });

      expect(mockNotifications.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'patient-user-1',
          message: 'Your provider is on the way.',
          type: 'BOOKING_STATUS_UPDATE',
        }),
      );
    });

    it('should transition ON_THE_WAY → ARRIVED and notify patient', async () => {
      const booking = { id: 'booking-1', status: 'ON_THE_WAY' };
      const bookingWithPatient = {
        ...booking,
        patient: { id: 'patient-1', userId: 'patient-user-1' },
      };

      mockPrisma.booking.findUnique
        .mockResolvedValueOnce(booking)
        .mockResolvedValueOnce(bookingWithPatient);
      mockPrisma.booking.update.mockResolvedValue({
        ...booking,
        status: 'ARRIVED',
      });
      mockPrisma.bookingStatusHistory.create.mockResolvedValue({});
      mockNotifications.createNotification.mockResolvedValue({});

      await service.updateBookingStatus('booking-1', 'user-1', {
        status: 'ARRIVED' as any,
      });

      expect(mockNotifications.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Your provider has arrived.',
        }),
      );
    });

    it('should transition ARRIVED → IN_PROGRESS and notify patient', async () => {
      const booking = { id: 'booking-1', status: 'ARRIVED' };
      const bookingWithPatient = {
        ...booking,
        patient: { id: 'patient-1', userId: 'patient-user-1' },
      };

      mockPrisma.booking.findUnique
        .mockResolvedValueOnce(booking)
        .mockResolvedValueOnce(bookingWithPatient);
      mockPrisma.booking.update.mockResolvedValue({
        ...booking,
        status: 'IN_PROGRESS',
      });
      mockPrisma.bookingStatusHistory.create.mockResolvedValue({});
      mockNotifications.createNotification.mockResolvedValue({});

      await service.updateBookingStatus('booking-1', 'user-1', {
        status: 'IN_PROGRESS' as any,
      });

      expect(mockNotifications.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Your consultation is now in progress.',
        }),
      );
    });

    it('should transition IN_PROGRESS → COMPLETED and notify patient', async () => {
      const booking = { id: 'booking-1', status: 'IN_PROGRESS' };
      const bookingWithPatient = {
        ...booking,
        patient: { id: 'patient-1', userId: 'patient-user-1' },
      };

      mockPrisma.booking.findUnique
        .mockResolvedValueOnce(booking)
        .mockResolvedValueOnce(bookingWithPatient);
      mockPrisma.booking.update.mockResolvedValue({
        ...booking,
        status: 'COMPLETED',
      });
      mockPrisma.bookingStatusHistory.create.mockResolvedValue({});
      mockNotifications.createNotification.mockResolvedValue({});

      await service.updateBookingStatus('booking-1', 'user-1', {
        status: 'COMPLETED' as any,
      });

      expect(mockNotifications.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Your consultation has been completed.',
        }),
      );
    });

    it('should transition COMPLETED → SUMMARY_SUBMITTED when summary exists', async () => {
      setupTransition('COMPLETED');
      mockPrisma.consultationSummary.findUnique.mockResolvedValue({
        id: 'summary-1',
        bookingId: 'booking-1',
      });

      const result = await service.updateBookingStatus('booking-1', 'user-1', {
        status: 'SUMMARY_SUBMITTED' as any,
      });

      expect(result.status).toBe('SUMMARY_SUBMITTED');
    });

    it('should reject SUMMARY_SUBMITTED when no summary exists', async () => {
      setupTransition('COMPLETED');
      mockPrisma.consultationSummary.findUnique.mockResolvedValue(null);

      await expect(
        service.updateBookingStatus('booking-1', 'user-1', {
          status: 'SUMMARY_SUBMITTED' as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should transition SUMMARY_SUBMITTED → CLOSED when summary exists', async () => {
      setupTransition('SUMMARY_SUBMITTED');
      mockPrisma.consultationSummary.findUnique.mockResolvedValue({
        id: 'summary-1',
        bookingId: 'booking-1',
      });

      const result = await service.updateBookingStatus('booking-1', 'user-1', {
        status: 'CLOSED' as any,
      });

      expect(result.status).toBe('CLOSED');
    });

    it('should reject CLOSED when no summary exists', async () => {
      setupTransition('SUMMARY_SUBMITTED');
      mockPrisma.consultationSummary.findUnique.mockResolvedValue(null);

      await expect(
        service.updateBookingStatus('booking-1', 'user-1', {
          status: 'CLOSED' as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject transitions from terminal states', async () => {
      for (const terminal of ['CLOSED', 'CANCELLED', 'DECLINED']) {
        mockPrisma.booking.findUnique.mockResolvedValue({
          id: 'booking-1',
          status: terminal,
        });
        await expect(
          service.updateBookingStatus('booking-1', 'user-1', {
            status: 'REQUESTED' as any,
          }),
        ).rejects.toThrow(BadRequestException);
      }
    });

    it('should reject skipping states (e.g., ACCEPTED → ARRIVED)', async () => {
      setupTransition('ACCEPTED');
      await expect(
        service.updateBookingStatus('booking-1', 'user-1', {
          status: 'ARRIVED' as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject backwards transitions (e.g., COMPLETED → IN_PROGRESS)', async () => {
      setupTransition('COMPLETED');
      await expect(
        service.updateBookingStatus('booking-1', 'user-1', {
          status: 'IN_PROGRESS' as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

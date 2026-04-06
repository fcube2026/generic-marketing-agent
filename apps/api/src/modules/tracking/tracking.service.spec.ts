import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('TrackingService', () => {
  let service: TrackingService;

  const mockPrisma = {
    booking: {
      findUnique: jest.fn(),
    },
    providerLocation: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TrackingService>(TrackingService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateLocation', () => {
    const userId = 'provider-user-1';
    const dto = { bookingId: 'booking-1', lat: 12.9716, lng: 77.5946 };

    it('should save provider location for an active booking', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        status: 'ON_THE_WAY',
        provider: { userId: 'provider-user-1' },
      });
      mockPrisma.providerLocation.create.mockResolvedValue({
        id: 'loc-1',
        bookingId: 'booking-1',
        lat: 12.9716,
        lng: 77.5946,
        recordedAt: new Date(),
      });

      const result = await service.updateLocation(userId, dto);
      expect(result.bookingId).toBe('booking-1');
      expect(mockPrisma.providerLocation.create).toHaveBeenCalledWith({
        data: { bookingId: 'booking-1', lat: 12.9716, lng: 77.5946 },
      });
    });

    it('should throw NotFoundException if booking does not exist', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);
      await expect(service.updateLocation(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not the assigned provider', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        status: 'ON_THE_WAY',
        provider: { userId: 'other-user' },
      });
      await expect(service.updateLocation(userId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if booking is not in a trackable status', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        status: 'COMPLETED',
        provider: { userId: 'provider-user-1' },
      });
      await expect(service.updateLocation(userId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it.each(['ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'])(
      'should allow update for %s status',
      async (status) => {
        mockPrisma.booking.findUnique.mockResolvedValue({
          id: 'booking-1',
          status,
          provider: { userId: 'provider-user-1' },
        });
        mockPrisma.providerLocation.create.mockResolvedValue({
          id: 'loc-1',
          bookingId: 'booking-1',
          lat: 12.9716,
          lng: 77.5946,
          recordedAt: new Date(),
        });

        await expect(
          service.updateLocation(userId, dto),
        ).resolves.toBeDefined();
      },
    );
  });

  describe('getProviderLocation', () => {
    const userId = 'patient-user-1';
    const bookingId = 'booking-1';

    it('should return the latest provider location', async () => {
      const now = new Date();
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        patient: { userId: 'patient-user-1' },
      });
      mockPrisma.providerLocation.findFirst.mockResolvedValue({
        id: 'loc-1',
        bookingId: 'booking-1',
        lat: 12.9716,
        lng: 77.5946,
        recordedAt: now,
      });

      const result = await service.getProviderLocation(bookingId, userId);
      expect(result).toEqual({ lat: 12.9716, lng: 77.5946, recordedAt: now });
    });

    it('should return null values when no location has been recorded', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        patient: { userId: 'patient-user-1' },
      });
      mockPrisma.providerLocation.findFirst.mockResolvedValue(null);

      const result = await service.getProviderLocation(bookingId, userId);
      expect(result).toEqual({ lat: null, lng: null, recordedAt: null });
    });

    it('should throw NotFoundException if booking does not exist', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);
      await expect(
        service.getProviderLocation(bookingId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the booking patient', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        patient: { userId: 'other-user' },
      });
      await expect(
        service.getProviderLocation(bookingId, userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

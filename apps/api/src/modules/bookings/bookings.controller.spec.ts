import { Test, TestingModule } from '@nestjs/testing';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

describe('BookingsController', () => {
  let controller: BookingsController;
  let service: BookingsService;

  const mockBooking = {
    id: 'booking-1',
    patientId: 'patient-1',
    providerId: 'provider-1',
    status: 'REQUESTED',
    totalFee: 500,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [
        {
          provide: BookingsService,
          useValue: {
            createBooking: jest.fn().mockResolvedValue(mockBooking),
            getBooking: jest.fn().mockResolvedValue(mockBooking),
            updateBookingStatus: jest.fn().mockResolvedValue(mockBooking),
            acceptBooking: jest
              .fn()
              .mockResolvedValue({ ...mockBooking, status: 'ACCEPTED' }),
            declineBooking: jest
              .fn()
              .mockResolvedValue({ ...mockBooking, status: 'DECLINED' }),
            cancelBooking: jest
              .fn()
              .mockResolvedValue({ ...mockBooking, status: 'CANCELLED' }),
          },
        },
      ],
    }).compile();

    controller = module.get<BookingsController>(BookingsController);
    service = module.get<BookingsService>(BookingsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('acceptBooking', () => {
    it('should call service.acceptBooking with correct params', async () => {
      const user = { id: 'user-1' };
      const result = await controller.acceptBooking(user, 'booking-1');
      expect(service.acceptBooking).toHaveBeenCalledWith('booking-1', 'user-1');
      expect(result.status).toBe('ACCEPTED');
    });
  });

  describe('declineBooking', () => {
    it('should call service.declineBooking with reason', async () => {
      const user = { id: 'user-1' };
      const dto = { reason: 'Not available' };
      const result = await controller.declineBooking(user, 'booking-1', dto);
      expect(service.declineBooking).toHaveBeenCalledWith(
        'booking-1',
        'user-1',
        'Not available',
      );
      expect(result.status).toBe('DECLINED');
    });

    it('should call service.declineBooking without reason', async () => {
      const user = { id: 'user-1' };
      const dto = {};
      await controller.declineBooking(user, 'booking-1', dto);
      expect(service.declineBooking).toHaveBeenCalledWith(
        'booking-1',
        'user-1',
        undefined,
      );
    });
  });

  describe('cancelBooking', () => {
    it('should call service.cancelBooking', async () => {
      const user = { id: 'user-1' };
      const result = await controller.cancelBooking(user, 'booking-1');
      expect(service.cancelBooking).toHaveBeenCalledWith('booking-1', 'user-1');
      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('createBooking', () => {
    it('should call service.createBooking', async () => {
      const user = { id: 'user-1' };
      const dto = {
        providerId: 'provider-1',
        serviceCategoryId: 'cat-1',
        mode: 'HOME_VISIT' as const,
        scheduledAt: '2025-01-01T10:00:00Z',
      };
      await controller.createBooking(user, dto as any);
      expect(service.createBooking).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('getBooking', () => {
    it('should call service.getBooking', async () => {
      const user = { id: 'user-1' };
      await controller.getBooking(user, 'booking-1');
      expect(service.getBooking).toHaveBeenCalledWith('booking-1', 'user-1');
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';

describe('TrackingController', () => {
  let controller: TrackingController;
  let service: TrackingService;

  const mockLocation = {
    id: 'loc-1',
    bookingId: 'booking-1',
    lat: 12.9716,
    lng: 77.5946,
    recordedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrackingController],
      providers: [
        {
          provide: TrackingService,
          useValue: {
            updateLocation: jest.fn().mockResolvedValue(mockLocation),
            getProviderLocation: jest.fn().mockResolvedValue({
              lat: 12.9716,
              lng: 77.5946,
              recordedAt: mockLocation.recordedAt,
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<TrackingController>(TrackingController);
    service = module.get<TrackingService>(TrackingService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('updateLocation', () => {
    it('should call service.updateLocation with correct params', async () => {
      const user = { id: 'provider-user-1' };
      const dto = { bookingId: 'booking-1', lat: 12.9716, lng: 77.5946 };
      const result = await controller.updateLocation(user, dto);
      expect(service.updateLocation).toHaveBeenCalledWith(
        'provider-user-1',
        dto,
      );
      // result is a union – narrow to the success branch for the assertion
      expect((result as { bookingId: string }).bookingId).toBe('booking-1');
    });
  });

  describe('getProviderLocation', () => {
    it('should call service.getProviderLocation with correct params', async () => {
      const user = { id: 'patient-user-1' };
      const result = await controller.getProviderLocation(user, 'booking-1');
      expect(service.getProviderLocation).toHaveBeenCalledWith(
        'booking-1',
        'patient-user-1',
      );
      expect(result.lat).toBe(12.9716);
      expect(result.lng).toBe(77.5946);
    });
  });
});

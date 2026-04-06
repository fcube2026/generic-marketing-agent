import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

describe('ProvidersController', () => {
  let controller: ProvidersController;
  let service: ProvidersService;

  const mockProfile = {
    id: 'profile-1',
    userId: 'user-1',
    name: 'Dr. Smith',
    specialization: 'General Physician',
    contactInfo: 'dr.smith@example.com',
    bio: 'Experienced doctor',
    isVerified: false,
    isActive: true,
    isAvailable: false,
    providerServices: [],
    user: { id: 'user-1', phone: '+919876543210', role: 'PROVIDER' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProvidersController],
      providers: [
        {
          provide: ProvidersService,
          useValue: {
            onboard: jest.fn().mockResolvedValue(mockProfile),
            getMyProfile: jest.fn().mockResolvedValue(mockProfile),
            updateProfile: jest.fn().mockResolvedValue(mockProfile),
            updateAvailability: jest.fn().mockResolvedValue(mockProfile),
            getMyBookings: jest.fn().mockResolvedValue([]),
            getNearbyProviders: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    controller = module.get<ProvidersController>(ProvidersController);
    service = module.get<ProvidersService>(ProvidersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('onboard', () => {
    it('should create provider profile with required fields', async () => {
      const user = { id: 'user-1' };
      const dto = {
        name: 'Dr. Smith',
        specialization: 'General Physician',
        contactInfo: 'dr.smith@example.com',
      };

      const result = await controller.onboard(user, dto);

      expect(result).toEqual(mockProfile);
      expect(service.onboard).toHaveBeenCalledWith('user-1', dto);
    });

    it('should create provider profile with all fields', async () => {
      const user = { id: 'user-1' };
      const dto = {
        name: 'Dr. Smith',
        specialization: 'General Physician',
        contactInfo: 'dr.smith@example.com',
        bio: 'Experienced doctor',
        homeVisitEnabled: true,
        consultationFeeHomeVisit: 500,
        serviceCategoryIds: ['cat-1'],
      };

      await controller.onboard(user, dto);

      expect(service.onboard).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('getMyProfile', () => {
    it('should return provider profile', async () => {
      const user = { id: 'user-1' };

      const result = await controller.getMyProfile(user);

      expect(result).toEqual(mockProfile);
      expect(service.getMyProfile).toHaveBeenCalledWith('user-1');
    });
  });

  describe('updateProfile', () => {
    it('should update provider profile', async () => {
      const user = { id: 'user-1' };
      const dto = { contactInfo: 'new@example.com' };

      const result = await controller.updateProfile(user, dto);

      expect(result).toEqual(mockProfile);
      expect(service.updateProfile).toHaveBeenCalledWith('user-1', dto);
    });
  });
});

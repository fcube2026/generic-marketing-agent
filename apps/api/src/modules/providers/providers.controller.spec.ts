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
            uploadKycDocument: jest.fn().mockResolvedValue({
              id: 'doc-1',
              type: 'Medical License',
              documentUrl: 'https://example.com/doc.pdf',
              status: 'PENDING',
            }),
            getKycDocuments: jest.fn().mockResolvedValue([]),
            deleteKycDocument: jest
              .fn()
              .mockResolvedValue({ message: 'Document deleted successfully' }),
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

  describe('uploadKycDocument', () => {
    it('should upload a KYC document', async () => {
      const user = { id: 'user-1' };
      const dto = {
        type: 'Medical License',
        documentUrl: 'https://example.com/doc.pdf',
      };

      const result = await controller.uploadKycDocument(user, dto);

      expect(result).toEqual(
        expect.objectContaining({
          id: 'doc-1',
          type: 'Medical License',
          status: 'PENDING',
        }),
      );
      expect(service.uploadKycDocument).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('getKycDocuments', () => {
    it('should return KYC documents for provider', async () => {
      const user = { id: 'user-1' };

      const result = await controller.getKycDocuments(user);

      expect(result).toEqual([]);
      expect(service.getKycDocuments).toHaveBeenCalledWith('user-1');
    });
  });

  describe('deleteKycDocument', () => {
    it('should delete a KYC document', async () => {
      const user = { id: 'user-1' };

      const result = await controller.deleteKycDocument(user, 'doc-1');

      expect(result).toEqual({ message: 'Document deleted successfully' });
      expect(service.deleteKycDocument).toHaveBeenCalledWith('user-1', 'doc-1');
    });
  });

  describe('getNearbyProviders', () => {
    it('should call service with parsed query params', async () => {
      const mockProviders = [{ id: 'p1', name: 'Dr. Smith', distance: 2.5 }];
      (service.getNearbyProviders as jest.Mock).mockResolvedValue(
        mockProviders,
      );

      const query = {
        lat: 12.9716,
        lng: 77.5946,
        serviceCategory: 'doctor',
        mode: undefined,
      };
      const result = await controller.getNearbyProviders(query as any);

      expect(result).toEqual(mockProviders);
      expect(service.getNearbyProviders).toHaveBeenCalledWith(
        12.9716,
        77.5946,
        'doctor',
        undefined,
        undefined,
      );
    });

    it('should return empty array when no providers found', async () => {
      (service.getNearbyProviders as jest.Mock).mockResolvedValue([]);

      const query = { lat: 12.9716, lng: 77.5946 };
      const result = await controller.getNearbyProviders(query as any);

      expect(result).toEqual([]);
    });
  });
});

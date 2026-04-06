import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('ProvidersService', () => {
  let service: ProvidersService;

  const mockPrisma = {
    user: {
      update: jest.fn(),
    },
    providerProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    providerService: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    providerLicense: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    serviceCategory: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvidersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProvidersService>(ProvidersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onboard', () => {
    const userId = 'user-1';
    const dto = {
      name: 'Dr. Smith',
      specialization: 'General Physician',
      contactInfo: 'dr.smith@example.com',
      bio: 'Experienced doctor',
      serviceCategoryIds: ['cat-1', 'cat-2'],
    };

    it('should create a new provider profile with contactInfo', async () => {
      const createdProfile = { id: 'profile-1', userId, ...dto };

      mockPrisma.providerProfile.findUnique
        .mockResolvedValueOnce(null) // no existing profile
        .mockResolvedValueOnce({
          ...createdProfile,
          providerServices: [],
          user: {},
        }); // final fetch
      mockPrisma.user.update.mockResolvedValue({
        id: userId,
        role: 'PROVIDER',
      });
      mockPrisma.providerProfile.create.mockResolvedValue(createdProfile);
      mockPrisma.providerService.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.serviceCategory.findMany.mockResolvedValue([
        { id: 'cat-1' },
        { id: 'cat-2' },
      ]);

      const result = await service.onboard(userId, dto);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { role: 'PROVIDER' },
      });
      expect(mockPrisma.providerProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: dto.name,
          specialization: dto.specialization,
          contactInfo: dto.contactInfo,
          bio: dto.bio,
          userId,
        }),
      });
      expect(mockPrisma.providerService.createMany).toHaveBeenCalledWith({
        data: [
          { providerId: 'profile-1', serviceCategoryId: 'cat-1' },
          { providerId: 'profile-1', serviceCategoryId: 'cat-2' },
        ],
        skipDuplicates: true,
      });
      expect(result).toBeDefined();
    });

    it('should update existing profile if provider already exists', async () => {
      const existingProfile = { id: 'profile-1', userId };

      mockPrisma.providerProfile.findUnique
        .mockResolvedValueOnce(existingProfile) // existing profile found
        .mockResolvedValueOnce(existingProfile) // updateProfile lookup
        .mockResolvedValueOnce({ ...existingProfile, providerServices: [] }); // final fetch
      mockPrisma.providerProfile.update.mockResolvedValue(existingProfile);
      mockPrisma.providerService.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.providerService.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.serviceCategory.findMany.mockResolvedValue([
        { id: 'cat-1' },
        { id: 'cat-2' },
      ]);

      const result = await service.onboard(userId, dto);

      expect(mockPrisma.providerProfile.create).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should create profile without service categories when none provided', async () => {
      const dtoWithoutCategories = {
        name: 'Dr. Jane',
        specialization: 'Dermatology',
        contactInfo: '+919876543210',
      };
      const createdProfile = {
        id: 'profile-2',
        userId,
        ...dtoWithoutCategories,
      };

      mockPrisma.providerProfile.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...createdProfile,
          providerServices: [],
          user: {},
        });
      mockPrisma.user.update.mockResolvedValue({
        id: userId,
        role: 'PROVIDER',
      });
      mockPrisma.providerProfile.create.mockResolvedValue(createdProfile);

      await service.onboard(userId, dtoWithoutCategories);

      expect(mockPrisma.providerService.createMany).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when home visit enabled without fee', async () => {
      const invalidDto = {
        name: 'Dr. Smith',
        specialization: 'General Physician',
        contactInfo: 'dr.smith@example.com',
        homeVisitEnabled: true,
        consultationFeeHomeVisit: 0,
      };

      mockPrisma.providerProfile.findUnique.mockResolvedValueOnce(null);

      await expect(service.onboard(userId, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when clinic visit enabled without fee', async () => {
      const invalidDto = {
        name: 'Dr. Smith',
        specialization: 'General Physician',
        contactInfo: 'dr.smith@example.com',
        doctorPlaceVisitEnabled: true,
        consultationFeeDoctorPlace: 0,
      };

      mockPrisma.providerProfile.findUnique.mockResolvedValueOnce(null);

      await expect(service.onboard(userId, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid service category IDs', async () => {
      const invalidDto = {
        name: 'Dr. Smith',
        specialization: 'General Physician',
        contactInfo: 'dr.smith@example.com',
        serviceCategoryIds: ['valid-1', 'invalid-1'],
      };

      mockPrisma.providerProfile.findUnique.mockResolvedValueOnce(null);
      mockPrisma.serviceCategory.findMany.mockResolvedValue([
        { id: 'valid-1' },
      ]);

      await expect(service.onboard(userId, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getMyProfile', () => {
    it('should return provider profile with relations', async () => {
      const mockProfile = {
        id: 'profile-1',
        userId: 'user-1',
        name: 'Dr. Smith',
        specialization: 'General Physician',
        contactInfo: 'dr.smith@example.com',
        user: {},
        providerServices: [],
        availabilitySlots: [],
        licenses: [],
      };

      mockPrisma.providerProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await service.getMyProfile('user-1');

      expect(result).toEqual(mockProfile);
      expect(mockPrisma.providerProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: {
          user: true,
          providerServices: { include: { serviceCategory: true } },
          availabilitySlots: true,
          licenses: true,
        },
      });
    });

    it('should throw NotFoundException if profile not found', async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getMyProfile('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update profile with contactInfo', async () => {
      const existingProfile = { id: 'profile-1', userId: 'user-1' };
      const updateDto = { contactInfo: 'new@example.com', name: 'Dr. Updated' };

      mockPrisma.providerProfile.findUnique
        .mockResolvedValueOnce(existingProfile)
        .mockResolvedValueOnce({
          ...existingProfile,
          ...updateDto,
          providerServices: [],
        });
      mockPrisma.providerProfile.update.mockResolvedValue({
        ...existingProfile,
        ...updateDto,
      });

      const result = await service.updateProfile('user-1', updateDto);

      expect(mockPrisma.providerProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: updateDto,
      });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if profile not found', async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProfile('unknown', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when enabling home visit without fee', async () => {
      const existingProfile = { id: 'profile-1', userId: 'user-1' };
      mockPrisma.providerProfile.findUnique.mockResolvedValueOnce(
        existingProfile,
      );

      await expect(
        service.updateProfile('user-1', {
          homeVisitEnabled: true,
          consultationFeeHomeVisit: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when enabling clinic visit without fee', async () => {
      const existingProfile = { id: 'profile-1', userId: 'user-1' };
      mockPrisma.providerProfile.findUnique.mockResolvedValueOnce(
        existingProfile,
      );

      await expect(
        service.updateProfile('user-1', {
          doctorPlaceVisitEnabled: true,
          consultationFeeDoctorPlace: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid service category IDs on update', async () => {
      const existingProfile = { id: 'profile-1', userId: 'user-1' };
      mockPrisma.providerProfile.findUnique.mockResolvedValueOnce(
        existingProfile,
      );
      mockPrisma.serviceCategory.findMany.mockResolvedValue([]);

      await expect(
        service.updateProfile('user-1', {
          serviceCategoryIds: ['nonexistent-1'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update profile with clinicAddress', async () => {
      const existingProfile = { id: 'profile-1', userId: 'user-1' };
      const updateDto = { clinicAddress: '123 Clinic Rd, City, State 560001' };

      mockPrisma.providerProfile.findUnique
        .mockResolvedValueOnce(existingProfile)
        .mockResolvedValueOnce({
          ...existingProfile,
          ...updateDto,
          providerServices: [],
        });
      mockPrisma.providerProfile.update.mockResolvedValue({
        ...existingProfile,
        ...updateDto,
      });

      const result = await service.updateProfile('user-1', updateDto);

      expect(mockPrisma.providerProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: updateDto,
      });
      expect(result).toBeDefined();
    });
  });

  describe('uploadKycDocument', () => {
    const userId = 'user-1';
    const dto = {
      type: 'Medical License',
      documentUrl: 'https://storage.example.com/doc.pdf',
    };

    it('should create a KYC document with PENDING status', async () => {
      const profile = { id: 'profile-1', userId };
      const createdDoc = {
        id: 'doc-1',
        providerId: 'profile-1',
        type: dto.type,
        documentUrl: dto.documentUrl,
        status: 'PENDING',
        createdAt: new Date(),
      };

      mockPrisma.providerProfile.findUnique.mockResolvedValue(profile);
      mockPrisma.providerLicense.create.mockResolvedValue(createdDoc);

      const result = await service.uploadKycDocument(userId, dto);

      expect(mockPrisma.providerLicense.create).toHaveBeenCalledWith({
        data: {
          providerId: 'profile-1',
          type: dto.type,
          documentUrl: dto.documentUrl,
          status: 'PENDING',
        },
      });
      expect(result).toEqual(createdDoc);
    });

    it('should create a document with expiresAt when provided', async () => {
      const profile = { id: 'profile-1', userId };
      const dtoWithExpiry = {
        ...dto,
        expiresAt: '2025-12-31T00:00:00.000Z',
      };

      mockPrisma.providerProfile.findUnique.mockResolvedValue(profile);
      mockPrisma.providerLicense.create.mockResolvedValue({
        id: 'doc-1',
        ...dtoWithExpiry,
        status: 'PENDING',
      });

      await service.uploadKycDocument(userId, dtoWithExpiry);

      expect(mockPrisma.providerLicense.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiresAt: new Date('2025-12-31T00:00:00.000Z'),
        }),
      });
    });

    it('should throw NotFoundException if profile not found', async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(null);

      await expect(service.uploadKycDocument('unknown', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getKycDocuments', () => {
    it('should return all KYC documents for the provider', async () => {
      const profile = { id: 'profile-1', userId: 'user-1' };
      const documents = [
        {
          id: 'doc-1',
          type: 'Medical License',
          documentUrl: 'https://example.com/doc1.pdf',
          status: 'PENDING',
        },
        {
          id: 'doc-2',
          type: 'Government ID',
          documentUrl: 'https://example.com/doc2.pdf',
          status: 'APPROVED',
        },
      ];

      mockPrisma.providerProfile.findUnique.mockResolvedValue(profile);
      mockPrisma.providerLicense.findMany.mockResolvedValue(documents);

      const result = await service.getKycDocuments('user-1');

      expect(result).toEqual(documents);
      expect(mockPrisma.providerLicense.findMany).toHaveBeenCalledWith({
        where: { providerId: 'profile-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw NotFoundException if profile not found', async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getKycDocuments('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteKycDocument', () => {
    it('should delete a PENDING document', async () => {
      const profile = { id: 'profile-1', userId: 'user-1' };
      const document = {
        id: 'doc-1',
        providerId: 'profile-1',
        status: 'PENDING',
      };

      mockPrisma.providerProfile.findUnique.mockResolvedValue(profile);
      mockPrisma.providerLicense.findFirst.mockResolvedValue(document);
      mockPrisma.providerLicense.delete.mockResolvedValue(document);

      const result = await service.deleteKycDocument('user-1', 'doc-1');

      expect(result).toEqual({ message: 'Document deleted successfully' });
      expect(mockPrisma.providerLicense.delete).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
      });
    });

    it('should delete a REJECTED document', async () => {
      const profile = { id: 'profile-1', userId: 'user-1' };
      const document = {
        id: 'doc-1',
        providerId: 'profile-1',
        status: 'REJECTED',
      };

      mockPrisma.providerProfile.findUnique.mockResolvedValue(profile);
      mockPrisma.providerLicense.findFirst.mockResolvedValue(document);
      mockPrisma.providerLicense.delete.mockResolvedValue(document);

      const result = await service.deleteKycDocument('user-1', 'doc-1');

      expect(result).toEqual({ message: 'Document deleted successfully' });
    });

    it('should throw BadRequestException for APPROVED documents', async () => {
      const profile = { id: 'profile-1', userId: 'user-1' };
      const document = {
        id: 'doc-1',
        providerId: 'profile-1',
        status: 'APPROVED',
      };

      mockPrisma.providerProfile.findUnique.mockResolvedValue(profile);
      mockPrisma.providerLicense.findFirst.mockResolvedValue(document);

      await expect(
        service.deleteKycDocument('user-1', 'doc-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if document not found', async () => {
      const profile = { id: 'profile-1', userId: 'user-1' };

      mockPrisma.providerProfile.findUnique.mockResolvedValue(profile);
      mockPrisma.providerLicense.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteKycDocument('user-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if profile not found', async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteKycDocument('unknown', 'doc-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getNearbyProviders', () => {
    const patientLat = 12.9716;
    const patientLng = 77.5946;

    const makeProvider = (overrides: Record<string, any> = {}) => ({
      id: 'provider-1',
      userId: 'user-1',
      name: 'Dr. Smith',
      specialization: 'General Physician',
      isAvailable: true,
      isActive: true,
      isVerified: true,
      homeVisitEnabled: true,
      doctorPlaceVisitEnabled: false,
      consultationFeeHomeVisit: 500,
      consultationFeeDoctorPlace: 0,
      serviceRadius: 10,
      currentLat: 12.9726,
      currentLng: 77.5956,
      providerServices: [
        {
          serviceCategory: { id: 'cat-1', name: 'Doctor', slug: 'doctor' },
        },
      ],
      user: { id: 'user-1', phone: '+919876543210' },
      ...overrides,
    });

    it('should return providers within radius sorted by distance', async () => {
      const nearProvider = makeProvider({
        id: 'near',
        currentLat: 12.972,
        currentLng: 77.595,
      });
      const farProvider = makeProvider({
        id: 'far',
        currentLat: 12.975,
        currentLng: 77.598,
        serviceRadius: 10,
      });

      mockPrisma.providerProfile.findMany.mockResolvedValue([
        farProvider,
        nearProvider,
      ]);

      const result = await service.getNearbyProviders(patientLat, patientLng);

      expect(result.length).toBe(2);
      expect(result[0].id).toBe('near');
      expect(result[1].id).toBe('far');
      expect(result[0].distance).toBeLessThan(result[1].distance);
    });

    it('should filter out providers outside their service radius', async () => {
      const nearProvider = makeProvider({
        id: 'near',
        currentLat: 12.972,
        currentLng: 77.595,
        serviceRadius: 10,
      });
      const tooFarProvider = makeProvider({
        id: 'toofar',
        currentLat: 13.1,
        currentLng: 77.7,
        serviceRadius: 1,
      });

      mockPrisma.providerProfile.findMany.mockResolvedValue([
        nearProvider,
        tooFarProvider,
      ]);

      const result = await service.getNearbyProviders(patientLat, patientLng);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('near');
    });

    it('should pass serviceCategory filter to query', async () => {
      mockPrisma.providerProfile.findMany.mockResolvedValue([]);

      await service.getNearbyProviders(patientLat, patientLng, 'doctor');

      expect(mockPrisma.providerProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            providerServices: {
              some: {
                serviceCategory: { slug: 'doctor' },
              },
            },
          }),
        }),
      );
    });

    it('should pass HOME_VISIT mode filter to query', async () => {
      mockPrisma.providerProfile.findMany.mockResolvedValue([]);

      await service.getNearbyProviders(
        patientLat,
        patientLng,
        undefined,
        'HOME_VISIT',
      );

      expect(mockPrisma.providerProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            homeVisitEnabled: true,
          }),
        }),
      );
    });

    it('should pass DOCTOR_PLACE mode filter to query', async () => {
      mockPrisma.providerProfile.findMany.mockResolvedValue([]);

      await service.getNearbyProviders(
        patientLat,
        patientLng,
        undefined,
        'DOCTOR_PLACE',
      );

      expect(mockPrisma.providerProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            doctorPlaceVisitEnabled: true,
          }),
        }),
      );
    });

    it('should return empty array when no providers found', async () => {
      mockPrisma.providerProfile.findMany.mockResolvedValue([]);

      const result = await service.getNearbyProviders(patientLat, patientLng);

      expect(result).toEqual([]);
    });

    it('should include distance in returned results', async () => {
      const provider = makeProvider();
      mockPrisma.providerProfile.findMany.mockResolvedValue([provider]);

      const result = await service.getNearbyProviders(patientLat, patientLng);

      expect(result.length).toBe(1);
      expect(result[0]).toHaveProperty('distance');
      expect(typeof result[0].distance).toBe('number');
      expect(result[0].distance).toBeGreaterThan(0);
    });

    it('should filter providers with null coordinates', async () => {
      const validProvider = makeProvider({ id: 'valid' });
      const nullLatProvider = makeProvider({
        id: 'null-lat',
        currentLat: null,
        currentLng: 77.595,
      });

      mockPrisma.providerProfile.findMany.mockResolvedValue([
        validProvider,
        nullLatProvider,
      ]);

      const result = await service.getNearbyProviders(patientLat, patientLng);

      const ids = result.map((p: any) => p.id);
      expect(ids).toContain('valid');
      expect(ids).not.toContain('null-lat');
    });
  });
});

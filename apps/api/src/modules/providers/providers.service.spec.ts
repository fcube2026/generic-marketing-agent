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

      await expect(
        service.uploadKycDocument('unknown', dto),
      ).rejects.toThrow(NotFoundException);
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
});

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
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
});

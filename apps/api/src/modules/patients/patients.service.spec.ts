import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SupabaseSyncService } from '../../common/supabase/supabase-sync.service';

describe('PatientsService', () => {
  let service: PatientsService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    patientProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    address: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      delete: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
    },
  };

  const mockSupabaseSync = {
    syncPatient: jest.fn().mockResolvedValue(undefined),
    syncProvider: jest.fn().mockResolvedValue(undefined),
    syncBooking: jest.fn().mockResolvedValue(undefined),
    syncVideoSession: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SupabaseSyncService, useValue: mockSupabaseSync },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMyProfile', () => {
    const userId = 'user-1';

    it('should return patient profile when it exists', async () => {
      const mockProfile = {
        id: 'profile-1',
        userId,
        name: 'John Doe',
        dateOfBirth: new Date('1990-01-15'),
        gender: 'MALE',
      };
      const mockUser = {
        id: userId,
        phone: '+919876543210',
        patientProfile: mockProfile,
        addresses: [],
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getMyProfile(userId);

      expect(result).toEqual(mockProfile);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          patientProfile: true,
          addresses: true,
        },
      });
    });

    it('should return user with null patientProfile when profile does not exist', async () => {
      const mockUser = {
        id: userId,
        phone: '+919876543210',
        patientProfile: null,
        addresses: [],
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getMyProfile(userId);

      expect(result).toEqual({ user: mockUser, patientProfile: null });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMyProfile('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createOrUpdateProfile', () => {
    const userId = 'user-1';
    const createDto = {
      name: 'John Doe',
      dateOfBirth: '1990-01-15',
      gender: 'MALE',
    };

    it('should create a new patient profile when none exists', async () => {
      const createdProfile = { id: 'profile-1', userId, ...createDto };

      mockPrisma.patientProfile.findUnique.mockResolvedValue(null);
      mockPrisma.patientProfile.create.mockResolvedValue(createdProfile);

      const result = await service.createOrUpdateProfile(userId, createDto);

      expect(result).toEqual(createdProfile);
      expect(mockPrisma.patientProfile.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          dateOfBirth: new Date(createDto.dateOfBirth),
          user: { connect: { id: userId } },
        },
      });
    });

    it('should update existing profile when it already exists', async () => {
      const existingProfile = {
        id: 'profile-1',
        userId,
        name: 'Old Name',
        dateOfBirth: '1990-01-01',
        gender: 'MALE',
      };
      const updatedProfile = { ...existingProfile, ...createDto };

      mockPrisma.patientProfile.findUnique.mockResolvedValue(existingProfile);
      mockPrisma.patientProfile.update.mockResolvedValue(updatedProfile);

      const result = await service.createOrUpdateProfile(userId, createDto);

      expect(result).toEqual(updatedProfile);
      expect(mockPrisma.patientProfile.update).toHaveBeenCalledWith({
        where: { userId },
        data: {
          ...createDto,
          dateOfBirth: new Date(createDto.dateOfBirth),
        },
      });
      expect(mockPrisma.patientProfile.create).not.toHaveBeenCalled();
    });

    it('should create profile with all fields including emergencyContact', async () => {
      const dtoWithContact = {
        ...createDto,
        emergencyContact: '+919876543210',
      };
      const createdProfile = { id: 'profile-1', userId, ...dtoWithContact };

      mockPrisma.patientProfile.findUnique.mockResolvedValue(null);
      mockPrisma.patientProfile.create.mockResolvedValue(createdProfile);

      const result = await service.createOrUpdateProfile(
        userId,
        dtoWithContact,
      );

      expect(result).toEqual(createdProfile);
      expect(mockPrisma.patientProfile.create).toHaveBeenCalledWith({
        data: {
          ...dtoWithContact,
          dateOfBirth: new Date(dtoWithContact.dateOfBirth),
          user: { connect: { id: userId } },
        },
      });
    });
  });

  describe('getAddresses', () => {
    it('should return addresses ordered by default then createdAt', async () => {
      const mockAddresses = [
        { id: 'addr-1', userId: 'user-1', label: 'Home', isDefault: true },
        { id: 'addr-2', userId: 'user-1', label: 'Work', isDefault: false },
      ];

      mockPrisma.address.findMany.mockResolvedValue(mockAddresses);

      const result = await service.getAddresses('user-1');

      expect(result).toEqual(mockAddresses);
      expect(mockPrisma.address.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
    });
  });

  describe('addAddress', () => {
    const userId = 'user-1';
    const dto = {
      label: 'Home',
      addressLine: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      isDefault: true,
    };

    it('should clear existing defaults when adding a default address', async () => {
      const createdAddress = { id: 'addr-1', userId, ...dto };

      mockPrisma.address.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.address.create.mockResolvedValue(createdAddress);
      mockPrisma.address.findMany.mockResolvedValue([{ id: 'addr-1' }]);
      mockPrisma.address.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.addAddress(userId, dto);

      expect(result).toEqual(createdAddress);
      expect(mockPrisma.address.updateMany).toHaveBeenCalledWith({
        where: { userId },
        data: { isDefault: false },
      });
    });

    it('should not clear defaults when adding a non-default address', async () => {
      const nonDefaultDto = { ...dto, isDefault: false };
      const createdAddress = { id: 'addr-2', userId, ...nonDefaultDto };

      mockPrisma.address.create.mockResolvedValue(createdAddress);
      mockPrisma.address.findMany.mockResolvedValue([{ id: 'addr-2' }]);
      mockPrisma.address.deleteMany.mockResolvedValue({ count: 0 });

      await service.addAddress(userId, nonDefaultDto);

      expect(mockPrisma.address.updateMany).not.toHaveBeenCalled();
    });

    it('should keep only the latest 3 addresses after adding a new one', async () => {
      const createdAddress = { id: 'addr-4', userId, ...dto };
      const keepIds = [{ id: 'addr-4' }, { id: 'addr-3' }, { id: 'addr-2' }];

      mockPrisma.address.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.address.create.mockResolvedValue(createdAddress);
      mockPrisma.address.findMany.mockResolvedValue(keepIds);
      mockPrisma.address.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.addAddress(userId, dto);

      expect(result).toEqual(createdAddress);
      expect(mockPrisma.address.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { id: true },
      });
      expect(mockPrisma.address.deleteMany).toHaveBeenCalledWith({
        where: {
          userId,
          id: { notIn: ['addr-4', 'addr-3', 'addr-2'] },
          bookings: { none: {} },
          pharmacyOrders: { none: {} },
        },
      });
    });
  });

  describe('updateAddress', () => {
    const userId = 'user-1';
    const addressId = 'addr-1';
    const existingAddress = {
      id: addressId,
      userId,
      label: 'Home',
      addressLine: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      isDefault: false,
    };

    it('should update an existing address', async () => {
      const dto = { label: 'Office', city: 'Delhi' };
      const updatedAddress = { ...existingAddress, ...dto };

      mockPrisma.address.findFirst.mockResolvedValue(existingAddress);
      mockPrisma.address.update.mockResolvedValue(updatedAddress);

      const result = await service.updateAddress(userId, addressId, dto);

      expect(result).toEqual(updatedAddress);
      expect(mockPrisma.address.findFirst).toHaveBeenCalledWith({
        where: { id: addressId, userId },
      });
      expect(mockPrisma.address.update).toHaveBeenCalledWith({
        where: { id: addressId },
        data: dto,
      });
    });

    it('should clear existing defaults when setting address as default', async () => {
      const dto = { isDefault: true };
      const updatedAddress = { ...existingAddress, ...dto };

      mockPrisma.address.findFirst.mockResolvedValue(existingAddress);
      mockPrisma.address.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.address.update.mockResolvedValue(updatedAddress);

      const result = await service.updateAddress(userId, addressId, dto);

      expect(result).toEqual(updatedAddress);
      expect(mockPrisma.address.updateMany).toHaveBeenCalledWith({
        where: { userId },
        data: { isDefault: false },
      });
    });

    it('should throw NotFoundException when address does not exist', async () => {
      mockPrisma.address.findFirst.mockResolvedValue(null);

      await expect(
        service.updateAddress(userId, 'non-existent', { label: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when address belongs to another user', async () => {
      mockPrisma.address.findFirst.mockResolvedValue(null);

      await expect(
        service.updateAddress('other-user', addressId, { label: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAddress', () => {
    const userId = 'user-1';
    const addressId = 'addr-1';
    const existingAddress = {
      id: addressId,
      userId,
      label: 'Home',
      addressLine: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
    };

    it('should delete an existing address', async () => {
      mockPrisma.address.findFirst.mockResolvedValue(existingAddress);
      mockPrisma.address.delete.mockResolvedValue(existingAddress);

      const result = await service.deleteAddress(userId, addressId);

      expect(result).toEqual(existingAddress);
      expect(mockPrisma.address.findFirst).toHaveBeenCalledWith({
        where: { id: addressId, userId },
      });
      expect(mockPrisma.address.delete).toHaveBeenCalledWith({
        where: { id: addressId },
      });
    });

    it('should throw NotFoundException when address does not exist', async () => {
      mockPrisma.address.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteAddress(userId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when address belongs to another user', async () => {
      mockPrisma.address.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteAddress('other-user', addressId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMyBookings', () => {
    const userId = 'user-1';

    it('should return bookings when profile exists', async () => {
      const mockProfile = { id: 'profile-1', userId };
      const mockBookings = [
        { id: 'booking-1', patientId: 'profile-1', status: 'COMPLETED' },
      ];

      mockPrisma.patientProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.booking.findMany.mockResolvedValue(mockBookings);

      const result = await service.getMyBookings(userId);

      expect(result).toEqual(mockBookings);
      expect(mockPrisma.booking.findMany).toHaveBeenCalledWith({
        where: { patientId: 'profile-1' },
        include: {
          provider: true,
          serviceCategory: true,
          address: true,
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no profile exists', async () => {
      mockPrisma.patientProfile.findUnique.mockResolvedValue(null);

      const result = await service.getMyBookings(userId);

      expect(result).toEqual([]);
      expect(mockPrisma.booking.findMany).not.toHaveBeenCalled();
    });
  });
});

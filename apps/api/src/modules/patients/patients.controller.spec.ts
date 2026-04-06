import { Test, TestingModule } from '@nestjs/testing';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

describe('PatientsController', () => {
  let controller: PatientsController;
  let service: PatientsService;

  const mockProfile = {
    id: 'profile-1',
    userId: 'user-1',
    name: 'John Doe',
    dateOfBirth: '1990-01-15',
    gender: 'MALE',
    emergencyContact: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PatientsController],
      providers: [
        {
          provide: PatientsService,
          useValue: {
            getMyProfile: jest.fn().mockResolvedValue(mockProfile),
            createOrUpdateProfile: jest.fn().mockResolvedValue(mockProfile),
            getAddresses: jest.fn().mockResolvedValue([]),
            addAddress: jest.fn().mockResolvedValue({ id: 'addr-1' }),
            getMyBookings: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    controller = module.get<PatientsController>(PatientsController);
    service = module.get<PatientsService>(PatientsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyProfile', () => {
    it('should return patient profile', async () => {
      const user = { id: 'user-1' };

      const result = await controller.getMyProfile(user);

      expect(result).toEqual(mockProfile);
      expect(service.getMyProfile).toHaveBeenCalledWith('user-1');
    });
  });

  describe('createProfile', () => {
    it('should create patient profile with required fields', async () => {
      const user = { id: 'user-1' };
      const dto = {
        name: 'John Doe',
        dateOfBirth: '1990-01-15',
        gender: 'MALE',
      };

      const result = await controller.createProfile(user, dto);

      expect(result).toEqual(mockProfile);
      expect(service.createOrUpdateProfile).toHaveBeenCalledWith('user-1', dto);
    });

    it('should create patient profile with all fields', async () => {
      const user = { id: 'user-1' };
      const dto = {
        name: 'John Doe',
        dateOfBirth: '1990-01-15',
        gender: 'FEMALE',
        emergencyContact: '+919876543210',
      };

      await controller.createProfile(user, dto);

      expect(service.createOrUpdateProfile).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('updateProfile', () => {
    it('should update patient profile', async () => {
      const user = { id: 'user-1' };
      const dto = { name: 'Jane Doe' };

      const result = await controller.updateProfile(user, dto);

      expect(result).toEqual(mockProfile);
      expect(service.createOrUpdateProfile).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('getAddresses', () => {
    it('should return user addresses', async () => {
      const user = { id: 'user-1' };

      const result = await controller.getAddresses(user);

      expect(result).toEqual([]);
      expect(service.getAddresses).toHaveBeenCalledWith('user-1');
    });
  });

  describe('addAddress', () => {
    it('should add a new address', async () => {
      const user = { id: 'user-1' };
      const dto = {
        label: 'Home',
        addressLine: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      };

      const result = await controller.addAddress(user, dto);

      expect(result).toEqual({ id: 'addr-1' });
      expect(service.addAddress).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('getMyBookings', () => {
    it('should return user bookings', async () => {
      const user = { id: 'user-1' };

      const result = await controller.getMyBookings(user);

      expect(result).toEqual([]);
      expect(service.getMyBookings).toHaveBeenCalledWith('user-1');
    });
  });
});

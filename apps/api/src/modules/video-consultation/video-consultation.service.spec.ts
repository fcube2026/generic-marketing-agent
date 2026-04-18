import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VideoConsultationService } from './video-consultation.service';
import { PrismaService } from '../../common/prisma/prisma.service';

// Mock the 100ms SDK
jest.mock('@100mslive/server-sdk', () => ({
  SDK: jest.fn().mockImplementation(() => ({
    rooms: {
      create: jest.fn(),
    },
    auth: {
      getAuthToken: jest.fn(),
    },
  })),
}));

describe('VideoConsultationService', () => {
  let service: VideoConsultationService;
  let mockHms: {
    rooms: { create: jest.Mock };
    auth: { getAuthToken: jest.Mock };
  };

  const mockPrisma = {
    booking: {
      findUnique: jest.fn(),
    },
    videoSession: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockConfig = {
    get: jest.fn((key: string, defaultVal?: string) => {
      const values: Record<string, string> = {
        HMS_APP_ACCESS_KEY: 'test-access-key',
        HMS_APP_SECRET: 'test-secret',
        HMS_TEMPLATE_ID: 'test-template-id',
        VIDEO_MOCK_MODE: 'false',
      };
      return values[key] ?? defaultVal ?? '';
    }),
  };

  const baseBooking = {
    id: 'booking-1',
    status: 'ACCEPTED',
    patient: { userId: 'patient-user-1' },
    provider: { userId: 'provider-user-1' },
  };

  const baseSession = {
    id: 'session-1',
    bookingId: 'booking-1',
    roomId: 'hms-room-id-123',
    status: 'CREATED',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoConsultationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<VideoConsultationService>(VideoConsultationService);

    // Get the mocked HMS instance from the service
    const { SDK } = jest.requireMock('@100mslive/server-sdk');
    mockHms = SDK.mock.results[SDK.mock.results.length - 1]
      .value as typeof mockHms;

    jest.clearAllMocks();
    mockConfig.get.mockImplementation((key: string, defaultVal?: string) => {
      const values: Record<string, string> = {
        HMS_APP_ACCESS_KEY: 'test-access-key',
        HMS_APP_SECRET: 'test-secret',
        HMS_TEMPLATE_ID: 'test-template-id',
        VIDEO_MOCK_MODE: 'false',
      };
      return values[key] ?? defaultVal ?? '';
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── createRoom ────────────────────────────────────────────────────────────

  describe('createRoom', () => {
    it('should create a 100ms room and persist VideoSession for provider', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);
      mockPrisma.videoSession.findUnique.mockResolvedValue(null);
      mockHms.rooms.create.mockResolvedValue({ id: 'hms-room-id-123' });
      mockPrisma.videoSession.create.mockResolvedValue(baseSession);

      const result = await service.createRoom('booking-1', 'provider-user-1');

      expect(mockHms.rooms.create).toHaveBeenCalledWith({
        name: 'curex24-booking-1',
        description: 'Video consultation for booking booking-1',
        template_id: 'test-template-id',
      });
      expect(mockPrisma.videoSession.create).toHaveBeenCalledWith({
        data: {
          bookingId: 'booking-1',
          roomId: 'hms-room-id-123',
          status: 'CREATED',
        },
      });
      expect(result).toEqual(baseSession);
    });

    it('should create a 100ms room and persist VideoSession for patient', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);
      mockPrisma.videoSession.findUnique.mockResolvedValue(null);
      mockHms.rooms.create.mockResolvedValue({ id: 'hms-room-id-123' });
      mockPrisma.videoSession.create.mockResolvedValue(baseSession);

      const result = await service.createRoom('booking-1', 'patient-user-1');

      expect(result).toEqual(baseSession);
    });

    it('should return existing session if room already created', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);
      mockPrisma.videoSession.findUnique.mockResolvedValue(baseSession);

      const result = await service.createRoom('booking-1', 'provider-user-1');

      expect(mockHms.rooms.create).not.toHaveBeenCalled();
      expect(result).toEqual(baseSession);
    });

    it('should throw NotFoundException when booking not found', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      await expect(
        service.createRoom('booking-1', 'provider-user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for unrelated user', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);

      await expect(
        service.createRoom('booking-1', 'other-user-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when booking is not ACCEPTED', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        ...baseBooking,
        status: 'REQUESTED',
      });
      mockPrisma.videoSession.findUnique.mockResolvedValue(null);

      await expect(
        service.createRoom('booking-1', 'provider-user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException when 100ms API fails', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);
      mockPrisma.videoSession.findUnique.mockResolvedValue(null);
      mockHms.rooms.create.mockRejectedValue(new Error('100ms API error'));

      await expect(
        service.createRoom('booking-1', 'provider-user-1'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should create room without template_id when HMS_TEMPLATE_ID not set', async () => {
      mockConfig.get.mockImplementation((key: string, defaultVal?: string) => {
        if (key === 'HMS_TEMPLATE_ID') return undefined;
        const values: Record<string, string> = {
          HMS_APP_ACCESS_KEY: 'test-access-key',
          HMS_APP_SECRET: 'test-secret',
        };
        return values[key] ?? defaultVal ?? '';
      });

      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);
      mockPrisma.videoSession.findUnique.mockResolvedValue(null);
      mockHms.rooms.create.mockResolvedValue({ id: 'hms-room-id-456' });
      mockPrisma.videoSession.create.mockResolvedValue({
        ...baseSession,
        roomId: 'hms-room-id-456',
      });

      await service.createRoom('booking-1', 'provider-user-1');

      expect(mockHms.rooms.create).toHaveBeenCalledWith({
        name: 'curex24-booking-1',
        description: 'Video consultation for booking booking-1',
      });
    });
  });

  // ─── generateToken ─────────────────────────────────────────────────────────

  describe('generateToken', () => {
    it('should return a token for provider with host role', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);
      mockPrisma.videoSession.findUnique.mockResolvedValue(baseSession);
      mockHms.auth.getAuthToken.mockResolvedValue({ token: 'jwt-token-abc' });

      const result = await service.generateToken(
        'booking-1',
        'provider-user-1',
      );

      expect(mockHms.auth.getAuthToken).toHaveBeenCalledWith({
        roomId: 'hms-room-id-123',
        userId: 'provider-user-1',
        role: 'host',
      });
      expect(result).toEqual({
        token: 'jwt-token-abc',
        roomId: 'hms-room-id-123',
        role: 'host',
      });
    });

    it('should return a token for patient with guest role', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);
      mockPrisma.videoSession.findUnique.mockResolvedValue(baseSession);
      mockHms.auth.getAuthToken.mockResolvedValue({ token: 'jwt-token-xyz' });

      const result = await service.generateToken('booking-1', 'patient-user-1');

      expect(mockHms.auth.getAuthToken).toHaveBeenCalledWith({
        roomId: 'hms-room-id-123',
        userId: 'patient-user-1',
        role: 'guest',
      });
      expect(result).toEqual({
        token: 'jwt-token-xyz',
        roomId: 'hms-room-id-123',
        role: 'guest',
      });
    });

    it('should use custom role when provided', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);
      mockPrisma.videoSession.findUnique.mockResolvedValue(baseSession);
      mockHms.auth.getAuthToken.mockResolvedValue({
        token: 'jwt-token-custom',
      });

      const result = await service.generateToken(
        'booking-1',
        'provider-user-1',
        'broadcaster',
      );

      expect(mockHms.auth.getAuthToken).toHaveBeenCalledWith({
        roomId: 'hms-room-id-123',
        userId: 'provider-user-1',
        role: 'broadcaster',
      });
      expect(result.role).toBe('broadcaster');
    });

    it('should throw NotFoundException when booking not found', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      await expect(
        service.generateToken('booking-1', 'provider-user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for unrelated user', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);

      await expect(
        service.generateToken('booking-1', 'other-user-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when video session does not exist', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);
      mockPrisma.videoSession.findUnique.mockResolvedValue(null);

      await expect(
        service.generateToken('booking-1', 'provider-user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException when 100ms auth API fails', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);
      mockPrisma.videoSession.findUnique.mockResolvedValue(baseSession);
      mockHms.auth.getAuthToken.mockRejectedValue(
        new Error('100ms auth error'),
      );

      await expect(
        service.generateToken('booking-1', 'provider-user-1'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ─── mock mode ─────────────────────────────────────────────────────────────

  describe('mock mode (VIDEO_MOCK_MODE=true)', () => {
    let mockService: VideoConsultationService;

    beforeEach(async () => {
      mockConfig.get.mockImplementation((key: string, defaultVal?: string) => {
        const values: Record<string, string> = {
          HMS_APP_ACCESS_KEY: 'test-access-key',
          HMS_APP_SECRET: 'test-secret',
          VIDEO_MOCK_MODE: 'true',
        };
        return values[key] ?? defaultVal ?? '';
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          VideoConsultationService,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      mockService = module.get<VideoConsultationService>(
        VideoConsultationService,
      );
      jest.clearAllMocks();
    });

    it('createRoom — should use mock roomId without calling 100ms SDK', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);
      mockPrisma.videoSession.findUnique.mockResolvedValue(null);
      mockPrisma.videoSession.create.mockResolvedValue({
        ...baseSession,
        roomId: 'mock-room-booking-1',
      });

      await mockService.createRoom('booking-1', 'provider-user-1');

      expect(mockHms.rooms.create).not.toHaveBeenCalled();
      expect(mockPrisma.videoSession.create).toHaveBeenCalledWith({
        data: {
          bookingId: 'booking-1',
          roomId: 'mock-room-booking-1',
          status: 'CREATED',
        },
      });
    });

    it('generateToken — should return mock token without calling 100ms SDK', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);
      mockPrisma.videoSession.findUnique.mockResolvedValue(baseSession);

      const result = await mockService.generateToken(
        'booking-1',
        'provider-user-1',
      );

      expect(mockHms.auth.getAuthToken).not.toHaveBeenCalled();
      expect(result.token).toBe(
        'mock-token-hms-room-id-123-provider-user-1-host',
      );
      expect(result.roomId).toBe('hms-room-id-123');
      expect(result.role).toBe('host');
    });

    it('generateToken — mock token reflects patient guest role', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);
      mockPrisma.videoSession.findUnique.mockResolvedValue(baseSession);

      const result = await mockService.generateToken(
        'booking-1',
        'patient-user-1',
      );

      expect(result.token).toBe(
        'mock-token-hms-room-id-123-patient-user-1-guest',
      );
    });
  });
});

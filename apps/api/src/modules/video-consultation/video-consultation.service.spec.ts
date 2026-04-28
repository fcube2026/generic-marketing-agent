import { Test, TestingModule } from '@nestjs/testing';
import { VideoConsultationService } from './video-consultation.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SupabaseSyncService } from '../../common/supabase/supabase-sync.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('VideoConsultationService', () => {
  let service: VideoConsultationService;
  let prisma: any;
  let supabaseSync: any;

  beforeEach(async () => {
    prisma = {
      booking: {
        findUnique: jest.fn(),
      },
      videoSession: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    supabaseSync = {
      syncVideoSession: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoConsultationService,
        { provide: PrismaService, useValue: prisma },
        { provide: SupabaseSyncService, useValue: supabaseSync },
      ],
    }).compile();

    service = module.get<VideoConsultationService>(VideoConsultationService);
  });

  describe('createRoom', () => {
    it('throws NotFoundException if booking not found', async () => {
      prisma.booking.findUnique.mockResolvedValue(null);
      await expect(service.createRoom('booking-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException if user is neither patient nor provider', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        patient: { userId: 'patient-1' },
        provider: { userId: 'provider-1' },
      });
      await expect(service.createRoom('booking-1', 'stranger')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws BadRequestException if booking mode is not VIDEO_CONSULTATION', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        mode: 'IN_PERSON',
        patient: { userId: 'patient-1' },
        provider: { userId: 'provider-1' },
      });
      await expect(
        service.createRoom('booking-1', 'patient-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if booking status is not ACCEPTED', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        mode: 'VIDEO_CONSULTATION',
        status: 'REQUESTED',
        patient: { userId: 'patient-1' },
        provider: { userId: 'provider-1' },
      });
      await expect(
        service.createRoom('booking-1', 'patient-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns existing session if already created', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        mode: 'VIDEO_CONSULTATION',
        status: 'ACCEPTED',
        patient: { userId: 'patient-1' },
        provider: { userId: 'provider-1' },
      });
      const existingSession = { id: 'session-1', bookingId: 'booking-1' };
      prisma.videoSession.findUnique.mockResolvedValue(existingSession);

      const result = await service.createRoom('booking-1', 'patient-1');
      expect(result).toEqual(existingSession);
    });

    it('creates a new room, syncs to supabase, and returns the session', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        mode: 'VIDEO_CONSULTATION',
        status: 'ACCEPTED',
        patient: { userId: 'patient-1' },
        provider: { userId: 'provider-1' },
      });
      prisma.videoSession.findUnique.mockResolvedValue(null);
      const newSession = {
        id: 'session-1',
        bookingId: 'booking-1',
        roomId: 'room-uuid',
        status: 'CREATED',
        creatorUserId: 'provider-1',
      };
      prisma.videoSession.create.mockResolvedValue(newSession);

      const result = await service.createRoom('booking-1', 'provider-1');

      expect(prisma.videoSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookingId: 'booking-1',
          roomId: expect.stringMatching(/^room-/),
          status: 'CREATED',
          creatorUserId: 'provider-1',
        }),
      });
      expect(supabaseSync.syncVideoSession).toHaveBeenCalledWith(newSession);
      expect(result).toEqual(newSession);
    });
  });

  describe('generateToken', () => {
    it('throws NotFoundException if booking not found', async () => {
      prisma.booking.findUnique.mockResolvedValue(null);
      await expect(
        service.generateToken('booking-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if user is neither patient nor provider', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        patient: { userId: 'patient-1' },
        provider: { userId: 'provider-1' },
      });
      await expect(
        service.generateToken('booking-1', 'stranger'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException if video session not created yet', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        patient: { userId: 'patient-1' },
        provider: { userId: 'provider-1' },
      });
      prisma.videoSession.findUnique.mockResolvedValue(null);

      await expect(
        service.generateToken('booking-1', 'patient-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates token and syncs to supabase', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        patient: { userId: 'patient-1' },
        provider: { userId: 'provider-1' },
      });
      const existingSession = {
        id: 'session-1',
        roomId: 'room-123',
        bookingId: 'booking-1',
      };
      prisma.videoSession.findUnique.mockResolvedValue(existingSession);

      const updatedSession = {
        ...existingSession,
        sessionToken: 'mock-token-room-123-patient-1-guest',
      };
      prisma.videoSession.update.mockResolvedValue(updatedSession);

      const result = await service.generateToken('booking-1', 'patient-1');

      expect(prisma.videoSession.update).toHaveBeenCalledWith({
        where: { bookingId: 'booking-1' },
        data: {
          sessionToken: expect.stringContaining(
            'mock-token-room-123-patient-1',
          ),
        },
      });
      expect(supabaseSync.syncVideoSession).toHaveBeenCalledWith(
        updatedSession,
      );
      expect(result).toEqual({
        token: 'mock-token-room-123-patient-1-guest',
        roomId: 'room-123',
        role: 'guest',
      });
    });

    it('allows role override', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        patient: { userId: 'patient-1' },
        provider: { userId: 'provider-1' },
      });
      prisma.videoSession.findUnique.mockResolvedValue({ roomId: 'room-123' });
      prisma.videoSession.update.mockResolvedValue({});

      const result = await service.generateToken(
        'booking-1',
        'patient-1',
        'host',
      );
      expect(result.role).toBe('host');
      expect(result.token).toContain('-host');
    });
  });
});

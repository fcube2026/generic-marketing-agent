import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VideoWebhookService } from './video-webhook.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { VideoWebhookEventDto } from './dto/video-webhook-event.dto';

describe('VideoWebhookService', () => {
  let service: VideoWebhookService;

  const mockPrisma = {
    videoSession: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    booking: {
      update: jest.fn(),
    },
  };

  const makeMockConfig = (mockMode: boolean) => ({
    get: jest.fn((key: string, defaultVal?: string) => {
      if (key === 'VIDEO_MOCK_MODE') return mockMode ? 'true' : 'false';
      return defaultVal ?? '';
    }),
  });

  const buildModule = async (mockMode = true) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoWebhookService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: makeMockConfig(mockMode) },
      ],
    }).compile();
    return module.get<VideoWebhookService>(VideoWebhookService);
  };

  const baseSession = {
    id: 'session-1',
    bookingId: 'booking-1',
    roomId: 'mock-room-booking-1',
    status: 'CREATED',
    startedAt: null,
    endedAt: null,
    duration: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const eventWith = (
    type: string,
    data: object = { room_id: 'mock-room-booking-1' },
  ): VideoWebhookEventDto => ({ type, data }) as VideoWebhookEventDto;

  beforeEach(async () => {
    service = await buildModule(true);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── session.started ──────────────────────────────────────────────────────

  describe('session.started', () => {
    it('marks VideoSession IN_PROGRESS and updates Booking', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue(baseSession);
      mockPrisma.videoSession.update.mockResolvedValue({
        ...baseSession,
        status: 'IN_PROGRESS',
      });
      mockPrisma.booking.update.mockResolvedValue({});

      const result = await service.handleEvent(eventWith('session.started'));

      expect(mockPrisma.videoSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-1' },
          data: expect.objectContaining({ status: 'IN_PROGRESS' }),
        }),
      );
      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: { status: 'IN_PROGRESS' },
      });
      expect(result).toEqual({
        processed: true,
        message: 'Session marked as IN_PROGRESS',
      });
    });

    it('skips update when session is already COMPLETED', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        ...baseSession,
        status: 'COMPLETED',
      });

      const result = await service.handleEvent(eventWith('session.started'));

      expect(mockPrisma.videoSession.update).not.toHaveBeenCalled();
      expect(result.processed).toBe(false);
    });
  });

  // ─── session.ended ────────────────────────────────────────────────────────

  describe('session.ended', () => {
    it('marks VideoSession COMPLETED with duration and updates Booking', async () => {
      const startedAt = new Date(Date.now() - 120_000); // 2 minutes ago
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        ...baseSession,
        status: 'IN_PROGRESS',
        startedAt,
      });
      mockPrisma.videoSession.update.mockResolvedValue({});
      mockPrisma.booking.update.mockResolvedValue({});

      const result = await service.handleEvent(eventWith('session.ended'));

      const updateCall = mockPrisma.videoSession.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe('COMPLETED');
      expect(updateCall.data.endedAt).toBeInstanceOf(Date);
      expect(typeof updateCall.data.duration).toBe('number');
      expect(updateCall.data.duration).toBeGreaterThanOrEqual(119);

      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: { status: 'COMPLETED' },
      });
      expect(result).toEqual({
        processed: true,
        message: 'Session marked as COMPLETED',
      });
    });

    it('marks COMPLETED without duration when startedAt is null', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        ...baseSession,
        status: 'IN_PROGRESS',
        startedAt: null,
      });
      mockPrisma.videoSession.update.mockResolvedValue({});
      mockPrisma.booking.update.mockResolvedValue({});

      await service.handleEvent(eventWith('session.ended'));

      const updateCall = mockPrisma.videoSession.update.mock.calls[0][0];
      expect(updateCall.data.duration).toBeUndefined();
    });

    it('skips update when session is already COMPLETED', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        ...baseSession,
        status: 'COMPLETED',
      });

      const result = await service.handleEvent(eventWith('session.ended'));

      expect(mockPrisma.videoSession.update).not.toHaveBeenCalled();
      expect(result.processed).toBe(false);
    });
  });

  // ─── participant.joined ───────────────────────────────────────────────────

  describe('participant.joined', () => {
    it('transitions CREATED → WAITING on first join', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue(baseSession);
      mockPrisma.videoSession.update.mockResolvedValue({});

      const result = await service.handleEvent(eventWith('participant.joined'));

      expect(mockPrisma.videoSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { status: 'WAITING' },
      });
      expect(result).toEqual({
        processed: true,
        message: 'Session marked as WAITING',
      });
    });

    it('does not change status when session is already IN_PROGRESS', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        ...baseSession,
        status: 'IN_PROGRESS',
      });

      const result = await service.handleEvent(eventWith('participant.joined'));

      expect(mockPrisma.videoSession.update).not.toHaveBeenCalled();
      expect(result.processed).toBe(true);
    });

    it('skips update when session is EXPIRED', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        ...baseSession,
        status: 'EXPIRED',
      });

      const result = await service.handleEvent(eventWith('participant.joined'));

      expect(mockPrisma.videoSession.update).not.toHaveBeenCalled();
      expect(result.processed).toBe(false);
    });
  });

  // ─── participant.left ─────────────────────────────────────────────────────

  describe('participant.left', () => {
    it('logs and returns processed without updating statuses', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        ...baseSession,
        status: 'IN_PROGRESS',
      });

      const result = await service.handleEvent(
        eventWith('participant.left', {
          room_id: 'mock-room-booking-1',
          peer_id: 'peer-xyz',
        }),
      );

      expect(mockPrisma.videoSession.update).not.toHaveBeenCalled();
      expect(mockPrisma.booking.update).not.toHaveBeenCalled();
      expect(result).toEqual({
        processed: true,
        message: 'Participant leave recorded',
      });
    });
  });

  // ─── Error cases ──────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('throws BadRequestException when event data has no room_id or booking_id', async () => {
      await expect(
        service.handleEvent(eventWith('session.started', {})),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when session is not found by room_id', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue(null);

      await expect(
        service.handleEvent(
          eventWith('session.started', { room_id: 'non-existent-room' }),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('falls back to booking_id lookup when room_id lookup returns null', async () => {
      mockPrisma.videoSession.findUnique
        .mockResolvedValueOnce(null) // room_id lookup
        .mockResolvedValueOnce(baseSession); // booking_id lookup
      mockPrisma.videoSession.update.mockResolvedValue({});
      mockPrisma.booking.update.mockResolvedValue({});

      const result = await service.handleEvent(
        eventWith('session.started', {
          room_id: 'wrong-room',
          booking_id: 'booking-1',
        }),
      );

      expect(result.processed).toBe(true);
    });

    it('resolves session by booking_id alone when room_id is absent', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue(baseSession);
      mockPrisma.videoSession.update.mockResolvedValue({});
      mockPrisma.booking.update.mockResolvedValue({});

      const result = await service.handleEvent(
        eventWith('session.started', { booking_id: 'booking-1' }),
      );

      expect(result.processed).toBe(true);
    });

    it('skips Booking update when bookingId is null', async () => {
      mockPrisma.videoSession.findUnique.mockResolvedValue({
        ...baseSession,
        bookingId: null,
      });
      mockPrisma.videoSession.update.mockResolvedValue({});

      await service.handleEvent(eventWith('session.started'));

      expect(mockPrisma.videoSession.update).toHaveBeenCalled();
      expect(mockPrisma.booking.update).not.toHaveBeenCalled();
    });
  });
});

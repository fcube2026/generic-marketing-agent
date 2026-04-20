import { Test, TestingModule } from '@nestjs/testing';
import {
  VideoConsultationReminderService,
  VideoReminderJobData,
} from './video-consultation-reminder.service';
import { getQueueToken } from '@nestjs/bullmq';
import { REMINDER_QUEUE } from '../../common/queue/queue.module';

const mockJob = {
  remove: jest.fn().mockResolvedValue(undefined),
};

const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job-1' }),
  getJob: jest.fn(),
};

describe('VideoConsultationReminderService', () => {
  let service: VideoConsultationReminderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoConsultationReminderService,
        {
          provide: getQueueToken(REMINDER_QUEUE),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<VideoConsultationReminderService>(
      VideoConsultationReminderService,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('scheduleReminders', () => {
    it('should schedule 5-min and 1-min reminder jobs when session is in the future', async () => {
      const bookingId = 'booking-1';
      const scheduledAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now

      await service.scheduleReminders(
        bookingId,
        scheduledAt,
        'patient-user-1',
        'provider-user-1',
        'Dr. Smith',
        'John Doe',
      );

      expect(mockQueue.add).toHaveBeenCalledTimes(2);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'video-reminder',
        expect.objectContaining<Partial<VideoReminderJobData>>({
          bookingId,
          reminderType: '5min',
          patientUserId: 'patient-user-1',
          providerUserId: 'provider-user-1',
          providerName: 'Dr. Smith',
          patientName: 'John Doe',
        }),
        expect.objectContaining({
          jobId: `video-reminder-5min-${bookingId}`,
        }),
      );

      expect(mockQueue.add).toHaveBeenCalledWith(
        'video-reminder',
        expect.objectContaining<Partial<VideoReminderJobData>>({
          bookingId,
          reminderType: '1min',
        }),
        expect.objectContaining({
          jobId: `video-reminder-1min-${bookingId}`,
        }),
      );
    });

    it('should skip reminders when session is in the past', async () => {
      const bookingId = 'booking-past';
      const scheduledAt = new Date(Date.now() - 60 * 1000); // 1 min ago

      await service.scheduleReminders(
        bookingId,
        scheduledAt,
        'patient-user-1',
        'provider-user-1',
        'Dr. Smith',
        'John Doe',
      );

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should skip 5-min reminder but schedule 1-min when session is within 5 minutes', async () => {
      const bookingId = 'booking-close';
      const scheduledAt = new Date(Date.now() + 3 * 60 * 1000); // 3 min from now

      await service.scheduleReminders(
        bookingId,
        scheduledAt,
        'patient-user-1',
        'provider-user-1',
        'Dr. Smith',
        'John Doe',
      );

      expect(mockQueue.add).toHaveBeenCalledTimes(1);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'video-reminder',
        expect.objectContaining({ reminderType: '1min' }),
        expect.anything(),
      );
    });

    it('should not add jobs when queue is unavailable', async () => {
      const moduleNoQueue: TestingModule = await Test.createTestingModule({
        providers: [VideoConsultationReminderService],
      }).compile();

      const serviceNoQueue =
        moduleNoQueue.get<VideoConsultationReminderService>(
          VideoConsultationReminderService,
        );

      const scheduledAt = new Date(Date.now() + 30 * 60 * 1000);
      await expect(
        serviceNoQueue.scheduleReminders(
          'booking-1',
          scheduledAt,
          'patient-user-1',
          'provider-user-1',
          'Dr. Smith',
          'John',
        ),
      ).resolves.not.toThrow();
    });
  });

  describe('cancelReminders', () => {
    it('should remove both reminder jobs when they exist', async () => {
      mockQueue.getJob.mockResolvedValue(mockJob);

      await service.cancelReminders('booking-1');

      expect(mockQueue.getJob).toHaveBeenCalledWith(
        'video-reminder-5min-booking-1',
      );
      expect(mockQueue.getJob).toHaveBeenCalledWith(
        'video-reminder-1min-booking-1',
      );
      expect(mockJob.remove).toHaveBeenCalledTimes(2);
    });

    it('should not throw when jobs do not exist', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      await expect(service.cancelReminders('booking-1')).resolves.not.toThrow();
      expect(mockJob.remove).not.toHaveBeenCalled();
    });

    it('should continue cancelling remaining jobs even if one removal fails', async () => {
      const failingJob = {
        remove: jest.fn().mockRejectedValueOnce(new Error('removal failed')),
      };
      const succeedingJob = { remove: jest.fn().mockResolvedValue(undefined) };

      mockQueue.getJob
        .mockResolvedValueOnce(failingJob)
        .mockResolvedValueOnce(succeedingJob);

      await expect(service.cancelReminders('booking-1')).resolves.not.toThrow();
      expect(failingJob.remove).toHaveBeenCalled();
      expect(succeedingJob.remove).toHaveBeenCalled();
    });

    it('should do nothing when queue is unavailable', async () => {
      const moduleNoQueue: TestingModule = await Test.createTestingModule({
        providers: [VideoConsultationReminderService],
      }).compile();

      const serviceNoQueue =
        moduleNoQueue.get<VideoConsultationReminderService>(
          VideoConsultationReminderService,
        );

      await expect(
        serviceNoQueue.cancelReminders('booking-1'),
      ).resolves.not.toThrow();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import {
  FallbackQueueProcessor,
  WHATSAPP_FALLBACK_DELAY_MS,
} from './fallback-queue.processor';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { FeatureFlagService } from '../../common/feature-flags/feature-flags.service';
import { NotificationDeliveryStatus } from '@prisma/client';

describe('FallbackQueueProcessor', () => {
  let processor: FallbackQueueProcessor;
  let mockPrisma: any;
  let mockSmsService: any;
  let mockFeatureFlags: any;

  const mockNotificationLog = {
    id: 'log-1',
    userId: 'user-1',
    eventType: 'BOOKING_ACCEPTED',
    channel: 'WHATSAPP',
    status: NotificationDeliveryStatus.SENT,
    providerMessageId: 'SM123',
    sentAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPrisma = {
      notificationPreference: {
        findUnique: jest.fn().mockResolvedValue({
          userId: 'user-1',
          smsEnabled: true,
        }),
      },
      notificationLog: {
        findUnique: jest.fn().mockResolvedValue(mockNotificationLog),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'sms-log-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    mockSmsService = {
      sendTemplatedSms: jest
        .fn()
        .mockResolvedValue({ success: true, messageId: 'SMS123' }),
      sendSms: jest
        .fn()
        .mockResolvedValue({ success: true, messageId: 'SMS123' }),
    };

    mockFeatureFlags = {
      isSmsNotificationsEnabled: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FallbackQueueProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SmsService, useValue: mockSmsService },
        { provide: FeatureFlagService, useValue: mockFeatureFlags },
      ],
    }).compile();

    processor = module.get<FallbackQueueProcessor>(FallbackQueueProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should have correct fallback delay constant', () => {
    expect(WHATSAPP_FALLBACK_DELAY_MS).toBe(5 * 60 * 1000); // 5 minutes
  });

  describe('process', () => {
    const mockJob = {
      id: 'job-1',
      data: {
        notificationLogId: 'log-1',
        userId: 'user-1',
        phone: '+919876543210',
        title: 'Booking Accepted',
        message: 'Your booking has been accepted',
        type: 'BOOKING_ACCEPTED',
        smsTemplate: 'BOOKING_ACCEPTED',
        templateParams: { providerName: 'Dr. Smith', scheduledTime: '10 AM' },
        idempotencyKey: 'booking-123',
      },
    } as any;

    it('should skip when SMS notifications are disabled globally', async () => {
      mockFeatureFlags.isSmsNotificationsEnabled.mockReturnValue(false);

      await processor.process(mockJob);

      expect(mockSmsService.sendTemplatedSms).not.toHaveBeenCalled();
    });

    it('should skip when user has SMS disabled', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        userId: 'user-1',
        smsEnabled: false,
      });

      await processor.process(mockJob);

      expect(mockSmsService.sendTemplatedSms).not.toHaveBeenCalled();
    });

    it('should skip when WhatsApp message was delivered', async () => {
      mockPrisma.notificationLog.findUnique.mockResolvedValue({
        ...mockNotificationLog,
        status: NotificationDeliveryStatus.DELIVERED,
      });

      await processor.process(mockJob);

      expect(mockSmsService.sendTemplatedSms).not.toHaveBeenCalled();
    });

    it('should send SMS when WhatsApp is still SENT after timeout', async () => {
      mockPrisma.notificationLog.findUnique.mockResolvedValue({
        ...mockNotificationLog,
        status: NotificationDeliveryStatus.SENT,
      });

      await processor.process(mockJob);

      expect(mockPrisma.notificationLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: { status: NotificationDeliveryStatus.FALLBACK_TRIGGERED },
      });
      expect(mockSmsService.sendTemplatedSms).toHaveBeenCalledWith(
        '+919876543210',
        'BOOKING_ACCEPTED',
        { providerName: 'Dr. Smith', scheduledTime: '10 AM' },
      );
    });

    it('should send SMS when WhatsApp is still PENDING after timeout', async () => {
      mockPrisma.notificationLog.findUnique.mockResolvedValue({
        ...mockNotificationLog,
        status: NotificationDeliveryStatus.PENDING,
      });

      await processor.process(mockJob);

      expect(mockSmsService.sendTemplatedSms).toHaveBeenCalled();
    });

    it('should send SMS when WhatsApp FAILED', async () => {
      mockPrisma.notificationLog.findUnique.mockResolvedValue({
        ...mockNotificationLog,
        status: NotificationDeliveryStatus.FAILED,
      });

      await processor.process(mockJob);

      expect(mockSmsService.sendTemplatedSms).toHaveBeenCalled();
    });

    it('should prevent duplicate SMS fallback with idempotency key', async () => {
      mockPrisma.notificationLog.findFirst.mockResolvedValue({
        id: 'existing-sms-log',
        channel: 'SMS',
      });

      await processor.process(mockJob);

      expect(mockSmsService.sendTemplatedSms).not.toHaveBeenCalled();
    });

    it('should create SMS notification log with fallback reference', async () => {
      await processor.process(mockJob);

      expect(mockPrisma.notificationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          eventType: 'BOOKING_ACCEPTED',
          channel: 'SMS',
          status: NotificationDeliveryStatus.PENDING,
          metadata: { fallbackFrom: 'log-1' },
        }),
      });
    });

    it('should update SMS log on successful send', async () => {
      mockSmsService.sendTemplatedSms.mockResolvedValue({
        success: true,
        messageId: 'SMS123',
      });

      await processor.process(mockJob);

      expect(mockPrisma.notificationLog.update).toHaveBeenCalledWith({
        where: { id: 'sms-log-1' },
        data: expect.objectContaining({
          status: NotificationDeliveryStatus.SENT,
          providerMessageId: 'SMS123',
        }),
      });
    });

    it('should update SMS log on failed send', async () => {
      mockSmsService.sendTemplatedSms.mockResolvedValue({
        success: false,
        error: 'Invalid phone number',
      });

      await processor.process(mockJob);

      expect(mockPrisma.notificationLog.update).toHaveBeenCalledWith({
        where: { id: 'sms-log-1' },
        data: expect.objectContaining({
          status: NotificationDeliveryStatus.FAILED,
          errorMessage: 'Invalid phone number',
        }),
      });
    });

    it('should fall back to plain SMS when template not found', async () => {
      const jobWithoutTemplate = {
        ...mockJob,
        data: {
          ...mockJob.data,
          smsTemplate: undefined,
          templateParams: undefined,
        },
      };

      await processor.process(jobWithoutTemplate);

      expect(mockSmsService.sendSms).toHaveBeenCalledWith({
        to: '+919876543210',
        body: 'Booking Accepted: Your booking has been accepted',
      });
    });
  });
});

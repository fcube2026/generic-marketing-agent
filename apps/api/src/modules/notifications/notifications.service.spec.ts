import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PushNotificationService } from '../push-notifications/push-notification.service';
import { SmsService } from '../sms/sms.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { FeatureFlagService } from '../../common/feature-flags/feature-flags.service';
import {
  NOTIFICATION_QUEUE,
  FALLBACK_QUEUE,
} from '../../common/queue/queue.module';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockPrisma = {
    notification: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    notificationPreference: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    notificationLog: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockPushService = {
    sendToUser: jest.fn(),
    getUnreadBadgeCount: jest.fn(),
  };

  const mockSmsService = {
    sendTemplatedSms: jest.fn(),
    sendSms: jest.fn(),
  };

  const mockWhatsAppService = {
    sendTemplatedMessage: jest.fn(),
    sendMessage: jest.fn(),
  };

  const mockFeatureFlags = {
    isPushNotificationsEnabled: jest.fn().mockReturnValue(true),
    isWhatsappNotificationsEnabled: jest.fn().mockReturnValue(true),
    isSmsNotificationsEnabled: jest.fn().mockReturnValue(true),
    isNotificationQueueEnabled: jest.fn().mockReturnValue(false), // Sync mode for tests
  };

  const mockNotificationQueue = {
    add: jest.fn(),
  };

  const mockFallbackQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PushNotificationService, useValue: mockPushService },
        { provide: SmsService, useValue: mockSmsService },
        { provide: WhatsAppService, useValue: mockWhatsAppService },
        { provide: FeatureFlagService, useValue: mockFeatureFlags },
        {
          provide: getQueueToken(NOTIFICATION_QUEUE),
          useValue: mockNotificationQueue,
        },
        { provide: getQueueToken(FALLBACK_QUEUE), useValue: mockFallbackQueue },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();

    // Default mock for notification preferences
    mockPrisma.notificationPreference.findUnique.mockResolvedValue({
      id: 'pref-1',
      userId: 'user-1',
      pushEnabled: true,
      smsEnabled: true,
      whatsappEnabled: true,
      emailEnabled: false,
      bookingUpdates: true,
      paymentUpdates: true,
      reminderEnabled: true,
      marketingEnabled: false,
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserNotifications', () => {
    it('should return notifications for a user ordered by createdAt desc', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          userId: 'user-1',
          title: 'Booking Accepted',
          message: 'Your booking has been accepted',
          type: 'BOOKING_STATUS_UPDATE',
          isRead: false,
          metadata: null,
          createdAt: new Date(),
        },
        {
          id: 'notif-2',
          userId: 'user-1',
          title: 'Account Approved',
          message: 'Your account has been approved',
          type: 'PROVIDER_APPROVED',
          isRead: true,
          metadata: null,
          createdAt: new Date(),
        },
      ];

      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications);

      const result = await service.getUserNotifications('user-1');

      expect(result).toEqual(mockNotifications);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should return empty array when user has no notifications', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);

      const result = await service.getUserNotifications('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const mockNotification = {
        id: 'notif-1',
        userId: 'user-1',
        isRead: false,
      };
      const updatedNotification = { ...mockNotification, isRead: true };

      mockPrisma.notification.findFirst.mockResolvedValue(mockNotification);
      mockPrisma.notification.update.mockResolvedValue(updatedNotification);

      const result = await service.markAsRead('notif-1', 'user-1');

      expect(result).toEqual(updatedNotification);
      expect(mockPrisma.notification.findFirst).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
      });
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { isRead: true },
      });
    });

    it('should throw NotFoundException when notification does not exist', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when notification belongs to another user', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead('notif-1', 'user-other')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for a user', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead('user-1');

      expect(result).toEqual({ success: true });
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: { isRead: true },
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return the count of unread notifications', async () => {
      mockPrisma.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user-1');

      expect(result).toBe(5);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
    });

    it('should return 0 when no unread notifications', async () => {
      mockPrisma.notification.count.mockResolvedValue(0);

      const result = await service.getUnreadCount('user-1');

      expect(result).toBe(0);
    });
  });

  describe('getUserPreferences', () => {
    it('should return existing preferences', async () => {
      const mockPrefs = {
        id: 'pref-1',
        userId: 'user-1',
        pushEnabled: true,
        smsEnabled: true,
        whatsappEnabled: true,
      };
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(mockPrefs);

      const result = await service.getUserPreferences('user-1');

      expect(result).toEqual(mockPrefs);
    });

    it('should create default preferences if not exists', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      const newPrefs = { id: 'pref-new', userId: 'user-1', pushEnabled: true };
      mockPrisma.notificationPreference.create.mockResolvedValue(newPrefs);

      const result = await service.getUserPreferences('user-1');

      expect(result).toEqual(newPrefs);
      expect(mockPrisma.notificationPreference.create).toHaveBeenCalledWith({
        data: { userId: 'user-1' },
      });
    });
  });

  describe('createNotification (legacy method)', () => {
    it('should create an in-app notification and send push and WhatsApp', async () => {
      const data = {
        userId: 'user-1',
        title: 'Booking Accepted',
        message: 'Your booking has been accepted',
        type: 'BOOKING_ACCEPTED',
        metadata: { bookingId: 'booking-1' },
      };
      const createdNotification = {
        id: 'notif-1',
        ...data,
        isRead: false,
        createdAt: new Date(),
      };

      mockPrisma.notification.create.mockResolvedValue(createdNotification);
      mockPushService.getUnreadBadgeCount.mockResolvedValue(1);
      mockPushService.sendToUser.mockResolvedValue({ success: true });
      mockPrisma.user.findUnique.mockResolvedValue({ phone: '+919876543210' });
      mockWhatsAppService.sendTemplatedMessage.mockResolvedValue({
        success: true,
        messageId: 'WA123',
      });
      mockPrisma.notificationLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.createNotification(data);

      expect(result.inAppId).toBe('notif-1');
      expect(mockPrisma.notification.create).toHaveBeenCalled();
      expect(mockPushService.sendToUser).toHaveBeenCalled();
    });
  });

  describe('sendNotification', () => {
    it('should send notification via all channels when enabled', async () => {
      const payload = {
        userId: 'user-1',
        title: 'Test',
        message: 'Test message',
        type: 'BOOKING_ACCEPTED',
      };

      mockPrisma.notification.create.mockResolvedValue({ id: 'notif-1' });
      mockPushService.getUnreadBadgeCount.mockResolvedValue(1);
      mockPushService.sendToUser.mockResolvedValue({ success: true });
      mockPrisma.user.findUnique.mockResolvedValue({ phone: '+919876543210' });
      mockWhatsAppService.sendTemplatedMessage.mockResolvedValue({
        success: true,
        messageId: 'WA123',
      });
      mockPrisma.notificationLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.sendNotification(payload, {
        inApp: true,
        push: true,
        whatsapp: true,
        templateParams: { providerName: 'Dr. Test', scheduledTime: '10:00 AM' },
      });

      expect(result.inAppId).toBe('notif-1');
      expect(result.pushSent).toBe(true);
      expect(result.whatsappSent).toBe(true);
    });

    it('should not send push when user has disabled it', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        pushEnabled: false,
        smsEnabled: true,
        whatsappEnabled: true,
        bookingUpdates: true,
      });

      const payload = {
        userId: 'user-1',
        title: 'Test',
        message: 'Test message',
        type: 'BOOKING_ACCEPTED',
      };

      mockPrisma.notification.create.mockResolvedValue({ id: 'notif-1' });
      mockPrisma.user.findUnique.mockResolvedValue({ phone: '+919876543210' });
      mockWhatsAppService.sendTemplatedMessage.mockResolvedValue({
        success: true,
        messageId: 'WA123',
      });
      mockPrisma.notificationLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.sendNotification(payload, {
        inApp: true,
        push: true,
        whatsapp: true,
      });

      expect(result.inAppId).toBe('notif-1');
      expect(result.pushSent).toBe(false);
      expect(mockPushService.sendToUser).not.toHaveBeenCalled();
    });

    it('should not send WhatsApp when user has disabled it', async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        pushEnabled: true,
        smsEnabled: true,
        whatsappEnabled: false,
        bookingUpdates: true,
      });

      const payload = {
        userId: 'user-1',
        title: 'Test',
        message: 'Test message',
        type: 'BOOKING_ACCEPTED',
      };

      mockPrisma.notification.create.mockResolvedValue({ id: 'notif-1' });
      mockPushService.getUnreadBadgeCount.mockResolvedValue(1);
      mockPushService.sendToUser.mockResolvedValue({ success: true });

      const result = await service.sendNotification(payload, {
        inApp: true,
        push: true,
        whatsapp: true,
      });

      expect(result.inAppId).toBe('notif-1');
      expect(result.whatsappSent).toBe(false);
      expect(mockWhatsAppService.sendTemplatedMessage).not.toHaveBeenCalled();
    });

    it('should not send WhatsApp when feature flag is disabled', async () => {
      mockFeatureFlags.isWhatsappNotificationsEnabled.mockReturnValue(false);

      const payload = {
        userId: 'user-1',
        title: 'Test',
        message: 'Test message',
        type: 'BOOKING_ACCEPTED',
      };

      mockPrisma.notification.create.mockResolvedValue({ id: 'notif-1' });
      mockPushService.getUnreadBadgeCount.mockResolvedValue(1);
      mockPushService.sendToUser.mockResolvedValue({ success: true });
      mockPrisma.user.findUnique.mockResolvedValue({ phone: '+919876543210' });

      const result = await service.sendNotification(payload, {
        inApp: true,
        push: true,
        whatsapp: true,
      });

      expect(result.whatsappSent).toBe(false);
      expect(mockWhatsAppService.sendTemplatedMessage).not.toHaveBeenCalled();

      // Reset for other tests
      mockFeatureFlags.isWhatsappNotificationsEnabled.mockReturnValue(true);
    });

    it('should send SMS when WhatsApp fails', async () => {
      const payload = {
        userId: 'user-1',
        title: 'Test',
        message: 'Test message',
        type: 'BOOKING_ACCEPTED',
      };

      mockPrisma.notification.create.mockResolvedValue({ id: 'notif-1' });
      mockPushService.getUnreadBadgeCount.mockResolvedValue(1);
      mockPushService.sendToUser.mockResolvedValue({ success: true });
      mockPrisma.user.findUnique.mockResolvedValue({ phone: '+919876543210' });
      mockWhatsAppService.sendTemplatedMessage.mockRejectedValue(
        new Error('WhatsApp API error'),
      );
      mockSmsService.sendTemplatedSms.mockResolvedValue({
        success: true,
        messageId: 'SMS123',
      });

      const result = await service.sendNotification(payload, {
        inApp: true,
        push: true,
        whatsapp: true,
        sms: true,
        templateParams: { providerName: 'Dr. Test', scheduledTime: '10:00 AM' },
      });

      expect(result.whatsappSent).toBe(false);
      expect(result.smsSent).toBe(true);
    });
  });

  describe('updateDeliveryStatus', () => {
    it('should update delivery status to delivered', async () => {
      mockPrisma.notificationLog.findFirst.mockResolvedValue({
        id: 'log-1',
        providerMessageId: 'WA123',
        status: 'SENT',
      });
      mockPrisma.notificationLog.update.mockResolvedValue({});

      await service.updateDeliveryStatus('WA123', 'delivered');

      expect(mockPrisma.notificationLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: expect.objectContaining({
          status: 'DELIVERED',
          deliveredAt: expect.any(Date),
        }),
      });
    });

    it('should update delivery status to failed with error message', async () => {
      mockPrisma.notificationLog.findFirst.mockResolvedValue({
        id: 'log-1',
        providerMessageId: 'WA123',
        status: 'SENT',
      });
      mockPrisma.notificationLog.update.mockResolvedValue({});

      await service.updateDeliveryStatus('WA123', 'failed', 'Unreachable');

      expect(mockPrisma.notificationLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: expect.objectContaining({
          status: 'FAILED',
          failedAt: expect.any(Date),
          errorMessage: 'Unreachable',
        }),
      });
    });

    it('should handle read status as delivered', async () => {
      mockPrisma.notificationLog.findFirst.mockResolvedValue({
        id: 'log-1',
        providerMessageId: 'WA123',
        status: 'SENT',
        deliveredAt: null,
      });
      mockPrisma.notificationLog.update.mockResolvedValue({});

      await service.updateDeliveryStatus('WA123', 'read');

      expect(mockPrisma.notificationLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: expect.objectContaining({
          status: 'DELIVERED',
        }),
      });
    });
  });

  describe('getNotificationLogs', () => {
    it('should return notification logs for a user', async () => {
      const mockLogs = [
        { id: 'log-1', userId: 'user-1', channel: 'WHATSAPP', status: 'SENT' },
        { id: 'log-2', userId: 'user-1', channel: 'SMS', status: 'DELIVERED' },
      ];
      mockPrisma.notificationLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getNotificationLogs('user-1');

      expect(result).toEqual(mockLogs);
      expect(mockPrisma.notificationLog.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', channel: undefined },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should filter by channel when specified', async () => {
      mockPrisma.notificationLog.findMany.mockResolvedValue([]);

      await service.getNotificationLogs('user-1', {
        channel: 'WHATSAPP' as any,
      });

      expect(mockPrisma.notificationLog.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', channel: 'WHATSAPP' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });
  });
});

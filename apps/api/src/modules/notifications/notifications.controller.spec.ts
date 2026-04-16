import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from '../push-notifications/push-notification.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  const mockNotification = {
    id: 'notif-1',
    userId: 'user-1',
    title: 'Booking Accepted',
    message: 'Your booking has been accepted',
    type: 'BOOKING_STATUS_UPDATE',
    isRead: false,
    metadata: null,
    createdAt: new Date(),
  };

  const mockPreferences = {
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: {
            getUserNotifications: jest
              .fn()
              .mockResolvedValue([mockNotification]),
            markAsRead: jest
              .fn()
              .mockResolvedValue({ ...mockNotification, isRead: true }),
            markAllAsRead: jest.fn().mockResolvedValue({ success: true }),
            getUnreadCount: jest.fn().mockResolvedValue(3),
            getUserPreferences: jest.fn().mockResolvedValue(mockPreferences),
            updateUserPreferences: jest.fn().mockResolvedValue(mockPreferences),
            getNotificationLogs: jest.fn().mockResolvedValue([]),
            updateDeliveryStatus: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: PushNotificationService,
          useValue: {
            registerDeviceToken: jest.fn().mockResolvedValue(undefined),
            unregisterDeviceToken: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: WhatsAppService,
          useValue: {
            parseStatusCallback: jest.fn().mockReturnValue(null),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyNotifications', () => {
    it('should call service.getUserNotifications with user id', async () => {
      const user = { id: 'user-1' };

      const result = await controller.getMyNotifications(user);

      expect(result).toEqual([mockNotification]);
      expect(service.getUserNotifications).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getUnreadCount', () => {
    it('should call service.getUnreadCount with user id', async () => {
      const user = { id: 'user-1' };

      const result = await controller.getUnreadCount(user);

      expect(result).toBe(3);
      expect(service.getUnreadCount).toHaveBeenCalledWith('user-1');
    });
  });

  describe('markAsRead', () => {
    it('should call service.markAsRead with notification id and user id', async () => {
      const user = { id: 'user-1' };

      const result = await controller.markAsRead('notif-1', user);

      expect(result).toEqual({ ...mockNotification, isRead: true });
      expect(service.markAsRead).toHaveBeenCalledWith('notif-1', 'user-1');
    });
  });

  describe('markAllAsRead', () => {
    it('should call service.markAllAsRead with user id', async () => {
      const user = { id: 'user-1' };

      const result = await controller.markAllAsRead(user);

      expect(result).toEqual({ success: true });
      expect(service.markAllAsRead).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getPreferences', () => {
    it('should call service.getUserPreferences with user id', async () => {
      const user = { id: 'user-1' };

      const result = await controller.getPreferences(user);

      expect(result).toEqual(mockPreferences);
      expect(service.getUserPreferences).toHaveBeenCalledWith('user-1');
    });
  });

  describe('updatePreferences', () => {
    it('should call service.updateUserPreferences with user id and dto', async () => {
      const user = { id: 'user-1' };
      const dto = { pushEnabled: false };

      await controller.updatePreferences(user, dto);

      expect(service.updateUserPreferences).toHaveBeenCalledWith('user-1', dto);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

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
            getUnreadCount: jest.fn().mockResolvedValue(3),
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
});

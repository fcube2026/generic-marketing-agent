import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockPrisma = {
    notification: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
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

  describe('createNotification', () => {
    it('should create a notification with metadata', async () => {
      const data = {
        userId: 'user-1',
        title: 'Booking Accepted',
        message: 'Your booking has been accepted',
        type: 'BOOKING_STATUS_UPDATE',
        metadata: { bookingId: 'booking-1' },
      };
      const createdNotification = {
        id: 'notif-1',
        ...data,
        isRead: false,
        createdAt: new Date(),
      };

      mockPrisma.notification.create.mockResolvedValue(createdNotification);

      const result = await service.createNotification(data);

      expect(result).toEqual(createdNotification);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          title: 'Booking Accepted',
          message: 'Your booking has been accepted',
          type: 'BOOKING_STATUS_UPDATE',
          metadata: { bookingId: 'booking-1' },
        },
      });
    });

    it('should create a notification without metadata', async () => {
      const data = {
        userId: 'user-1',
        title: 'Welcome',
        message: 'Welcome to Curex24',
        type: 'WELCOME',
      };
      const createdNotification = {
        id: 'notif-2',
        ...data,
        metadata: null,
        isRead: false,
        createdAt: new Date(),
      };

      mockPrisma.notification.create.mockResolvedValue(createdNotification);

      const result = await service.createNotification(data);

      expect(result).toEqual(createdNotification);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          title: 'Welcome',
          message: 'Welcome to Curex24',
          type: 'WELCOME',
          metadata: undefined,
        },
      });
    });
  });
});

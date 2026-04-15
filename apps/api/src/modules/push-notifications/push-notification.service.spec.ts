import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PushNotificationService } from './push-notification.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    deviceToken: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    notification: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushNotificationService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PushNotificationService>(PushNotificationService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerDeviceToken', () => {
    it('should upsert device token', async () => {
      mockPrismaService.deviceToken.upsert.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        token: 'ExponentPushToken[xxx]',
        platform: 'android',
        isActive: true,
      });

      await service.registerDeviceToken(
        'user-1',
        'ExponentPushToken[xxx]',
        'android',
      );

      expect(mockPrismaService.deviceToken.upsert).toHaveBeenCalledWith({
        where: { token: 'ExponentPushToken[xxx]' },
        update: expect.objectContaining({
          userId: 'user-1',
          platform: 'android',
          isActive: true,
        }),
        create: expect.objectContaining({
          userId: 'user-1',
          token: 'ExponentPushToken[xxx]',
          platform: 'android',
          isActive: true,
        }),
      });
    });
  });

  describe('unregisterDeviceToken', () => {
    it('should deactivate device token', async () => {
      mockPrismaService.deviceToken.updateMany.mockResolvedValue({ count: 1 });

      await service.unregisterDeviceToken('ExponentPushToken[xxx]');

      expect(mockPrismaService.deviceToken.updateMany).toHaveBeenCalledWith({
        where: { token: 'ExponentPushToken[xxx]' },
        data: { isActive: false },
      });
    });
  });

  describe('unregisterAllDeviceTokens', () => {
    it('should deactivate all tokens for user', async () => {
      mockPrismaService.deviceToken.updateMany.mockResolvedValue({ count: 3 });

      await service.unregisterAllDeviceTokens('user-1');

      expect(mockPrismaService.deviceToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { isActive: false },
      });
    });
  });

  describe('getActiveTokens', () => {
    it('should return active tokens for user', async () => {
      mockPrismaService.deviceToken.findMany.mockResolvedValue([
        { token: 'ExponentPushToken[aaa]' },
        { token: 'ExponentPushToken[bbb]' },
      ]);

      const tokens = await service.getActiveTokens('user-1');

      expect(tokens).toEqual([
        'ExponentPushToken[aaa]',
        'ExponentPushToken[bbb]',
      ]);
      expect(mockPrismaService.deviceToken.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isActive: true },
        select: { token: true },
      });
    });

    it('should return empty array when no tokens', async () => {
      mockPrismaService.deviceToken.findMany.mockResolvedValue([]);

      const tokens = await service.getActiveTokens('user-1');

      expect(tokens).toEqual([]);
    });
  });

  describe('sendToUser', () => {
    it('should return success with empty tickets when no tokens', async () => {
      mockPrismaService.deviceToken.findMany.mockResolvedValue([]);

      const result = await service.sendToUser({
        userId: 'user-1',
        title: 'Test',
        body: 'Test message',
      });

      expect(result.success).toBe(true);
      expect(result.ticketIds).toEqual([]);
    });
  });

  describe('getUnreadBadgeCount', () => {
    it('should return unread notification count', async () => {
      mockPrismaService.notification.count.mockResolvedValue(5);

      const count = await service.getUnreadBadgeCount('user-1');

      expect(count).toBe(5);
      expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
    });
  });
});

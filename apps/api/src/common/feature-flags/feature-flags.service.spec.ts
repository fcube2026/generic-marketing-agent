import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FeatureFlagService } from './feature-flags.service';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;

  describe('with default values (no env vars)', () => {
    beforeEach(async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FeatureFlagService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<FeatureFlagService>(FeatureFlagService);
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should enable push notifications by default', () => {
      expect(service.isPushNotificationsEnabled()).toBe(true);
    });

    it('should enable WhatsApp notifications by default', () => {
      expect(service.isWhatsappNotificationsEnabled()).toBe(true);
    });

    it('should enable SMS notifications by default', () => {
      expect(service.isSmsNotificationsEnabled()).toBe(true);
    });

    it('should enable notification queue by default', () => {
      expect(service.isNotificationQueueEnabled()).toBe(true);
    });

    it('should enable appointment reminders by default', () => {
      expect(service.isAppointmentRemindersEnabled()).toBe(true);
    });

    it('should return all flags', () => {
      const flags = service.getAllFlags();
      expect(flags).toEqual({
        pushNotifications: true,
        whatsappNotifications: true,
        smsNotifications: true,
        notificationQueue: true,
        appointmentReminders: true,
      });
    });
  });

  describe('with env vars set to false', () => {
    beforeEach(async () => {
      const mockConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          const config: Record<string, string> = {
            FEATURE_PUSH_NOTIFICATIONS: 'false',
            FEATURE_WHATSAPP_NOTIFICATIONS: 'false',
            FEATURE_SMS_NOTIFICATIONS: 'false',
            FEATURE_NOTIFICATION_QUEUE: 'false',
            FEATURE_APPOINTMENT_REMINDERS: 'false',
          };
          return config[key];
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FeatureFlagService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<FeatureFlagService>(FeatureFlagService);
    });

    it('should disable push notifications when set to false', () => {
      expect(service.isPushNotificationsEnabled()).toBe(false);
    });

    it('should disable WhatsApp notifications when set to false', () => {
      expect(service.isWhatsappNotificationsEnabled()).toBe(false);
    });

    it('should disable SMS notifications when set to false', () => {
      expect(service.isSmsNotificationsEnabled()).toBe(false);
    });

    it('should disable notification queue when set to false', () => {
      expect(service.isNotificationQueueEnabled()).toBe(false);
    });

    it('should disable appointment reminders when set to false', () => {
      expect(service.isAppointmentRemindersEnabled()).toBe(false);
    });
  });

  describe('with env vars set to true', () => {
    beforeEach(async () => {
      const mockConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          const config: Record<string, string> = {
            FEATURE_PUSH_NOTIFICATIONS: 'true',
            FEATURE_WHATSAPP_NOTIFICATIONS: 'true',
            FEATURE_SMS_NOTIFICATIONS: 'true',
            FEATURE_NOTIFICATION_QUEUE: 'true',
            FEATURE_APPOINTMENT_REMINDERS: 'true',
          };
          return config[key];
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FeatureFlagService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<FeatureFlagService>(FeatureFlagService);
    });

    it('should enable push notifications when set to true', () => {
      expect(service.isPushNotificationsEnabled()).toBe(true);
    });

    it('should enable WhatsApp notifications when set to true', () => {
      expect(service.isWhatsappNotificationsEnabled()).toBe(true);
    });

    it('should enable SMS notifications when set to true', () => {
      expect(service.isSmsNotificationsEnabled()).toBe(true);
    });
  });

  describe('with env vars set to 1/0', () => {
    beforeEach(async () => {
      const mockConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          const config: Record<string, string> = {
            FEATURE_PUSH_NOTIFICATIONS: '1',
            FEATURE_WHATSAPP_NOTIFICATIONS: '0',
            FEATURE_SMS_NOTIFICATIONS: '1',
          };
          return config[key];
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FeatureFlagService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<FeatureFlagService>(FeatureFlagService);
    });

    it('should enable push notifications when set to 1', () => {
      expect(service.isPushNotificationsEnabled()).toBe(true);
    });

    it('should disable WhatsApp notifications when set to 0', () => {
      expect(service.isWhatsappNotificationsEnabled()).toBe(false);
    });

    it('should enable SMS notifications when set to 1', () => {
      expect(service.isSmsNotificationsEnabled()).toBe(true);
    });
  });

  describe('isChannelEnabled', () => {
    beforeEach(async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FeatureFlagService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<FeatureFlagService>(FeatureFlagService);
    });

    it('should return true for push channel', () => {
      expect(service.isChannelEnabled('push')).toBe(true);
    });

    it('should return true for whatsapp channel', () => {
      expect(service.isChannelEnabled('whatsapp')).toBe(true);
    });

    it('should return true for sms channel', () => {
      expect(service.isChannelEnabled('sms')).toBe(true);
    });

    it('should return false for email channel (not implemented)', () => {
      expect(service.isChannelEnabled('email')).toBe(false);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmsService, SMS_TEMPLATES } from './sms.service';

describe('SmsService', () => {
  let service: SmsService;
  let _configService: ConfigService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((_key: string) => {
        // Return empty values to simulate disabled SMS
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SmsService>(SmsService);
    _configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isEnabled', () => {
    it('should return false when Twilio credentials are not configured', () => {
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('sendSms', () => {
    it('should return mock success when disabled', async () => {
      const result = await service.sendSms({
        to: '+1234567890',
        body: 'Test message',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toContain('mock_');
    });
  });

  describe('sendTemplatedSms', () => {
    it('should send SMS with OTP template', async () => {
      const result = await service.sendTemplatedSms('+1234567890', 'OTP', {
        otp: '123456',
      });

      expect(result.success).toBe(true);
    });

    it('should return error for unknown template', async () => {
      const result = await service.sendTemplatedSms(
        '+1234567890',
        'UNKNOWN',
        {},
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Template not found');
    });

    it('should send booking accepted SMS with template', async () => {
      const result = await service.sendTemplatedSms(
        '+1234567890',
        'BOOKING_ACCEPTED',
        {
          providerName: 'Dr. Smith',
          scheduledTime: '10:00 AM',
        },
      );

      expect(result.success).toBe(true);
    });
  });

  describe('sendOtp', () => {
    it('should send OTP SMS', async () => {
      const result = await service.sendOtp('+1234567890', '654321');

      expect(result.success).toBe(true);
    });
  });

  describe('SMS_TEMPLATES', () => {
    it('should have OTP template', () => {
      const template = SMS_TEMPLATES['OTP'];
      expect(template).toBeDefined();
      expect(template({ otp: '123456' })).toContain('123456');
    });

    it('should have BOOKING_ACCEPTED template', () => {
      const template = SMS_TEMPLATES['BOOKING_ACCEPTED'];
      expect(template).toBeDefined();
      const result = template({
        providerName: 'Dr. Smith',
        scheduledTime: '10:00 AM',
      });
      expect(result).toContain('Dr. Smith');
      expect(result).toContain('accepted');
    });

    it('should have PROVIDER_APPROVED template', () => {
      const template = SMS_TEMPLATES['PROVIDER_APPROVED'];
      expect(template).toBeDefined();
      const result = template({});
      expect(result).toContain('approved');
      expect(result).toContain('Curex24');
    });

    it('should have PAYOUT_PROCESSED template', () => {
      const template = SMS_TEMPLATES['PAYOUT_PROCESSED'];
      expect(template).toBeDefined();
      const result = template({ amount: '1000' });
      expect(result).toContain('1000');
      expect(result).toContain('Payout');
    });

    it('should have LAB_RESULT_READY template', () => {
      const template = SMS_TEMPLATES['LAB_RESULT_READY'];
      expect(template).toBeDefined();
      const result = template({ testType: 'Blood Test' });
      expect(result).toContain('Blood Test');
      expect(result).toContain('available');
    });
  });
});

describe('SmsService with Twilio configured', () => {
  let service: SmsService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, string> = {
          TWILIO_ACCOUNT_SID: 'test_sid',
          TWILIO_AUTH_TOKEN: 'test_token',
          TWILIO_PHONE_NUMBER: '+1234567890',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SmsService>(SmsService);
  });

  it('should return enabled when Twilio credentials are configured', () => {
    expect(service.isEnabled()).toBe(true);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WhatsAppService, WHATSAPP_TEMPLATES } from './whatsapp.service';

describe('WhatsAppService', () => {
  let service: WhatsAppService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        // Return empty values to simulate disabled WhatsApp
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WhatsAppService>(WhatsAppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isEnabled', () => {
    it('should return false when Twilio credentials are not configured', () => {
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('isSandbox', () => {
    it('should return true when using sandbox number', () => {
      expect(service.isSandbox()).toBe(true);
    });
  });

  describe('sendMessage', () => {
    it('should return mock success when disabled', async () => {
      const result = await service.sendMessage({
        to: '+919876543210',
        body: 'Test message',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toContain('mock_wa_');
    });
  });

  describe('sendTemplatedMessage', () => {
    it('should send WhatsApp with BOOKING_ACCEPTED template', async () => {
      const result = await service.sendTemplatedMessage(
        '+919876543210',
        'BOOKING_ACCEPTED',
        {
          providerName: 'Dr. Smith',
          scheduledTime: '10:00 AM',
        },
      );

      expect(result.success).toBe(true);
    });

    it('should return error for unknown template', async () => {
      const result = await service.sendTemplatedMessage(
        '+919876543210',
        'UNKNOWN_TEMPLATE',
        {},
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Template not found');
    });

    it('should send APPOINTMENT_REMINDER template', async () => {
      const result = await service.sendTemplatedMessage(
        '+919876543210',
        'APPOINTMENT_REMINDER',
        {
          providerName: 'Dr. Sharma',
          scheduledTime: 'Apr 15, 3:00 PM',
        },
      );

      expect(result.success).toBe(true);
    });

    it('should send PRESCRIPTION_UPLOADED template', async () => {
      const result = await service.sendTemplatedMessage(
        '+919876543210',
        'PRESCRIPTION_UPLOADED',
        {
          providerName: 'Dr. Patel',
        },
      );

      expect(result.success).toBe(true);
    });

    it('should send DIAGNOSTIC_BOOKED template', async () => {
      const result = await service.sendTemplatedMessage(
        '+919876543210',
        'DIAGNOSTIC_BOOKED',
        {
          testType: 'Blood Test',
          scheduledTime: 'Tomorrow 9 AM',
        },
      );

      expect(result.success).toBe(true);
    });
  });

  describe('parseStatusCallback', () => {
    it('should parse valid status callback', () => {
      const result = service.parseStatusCallback({
        MessageSid: 'SM123456',
        MessageStatus: 'delivered',
      });

      expect(result).toEqual({
        messageId: 'SM123456',
        status: 'delivered',
        errorCode: undefined,
        errorMessage: undefined,
      });
    });

    it('should return null for invalid callback', () => {
      const result = service.parseStatusCallback({});

      expect(result).toBeNull();
    });

    it('should include error info for failed status', () => {
      const result = service.parseStatusCallback({
        MessageSid: 'SM123456',
        MessageStatus: 'failed',
        ErrorCode: '30003',
        ErrorMessage: 'Unreachable destination',
      });

      expect(result).toEqual({
        messageId: 'SM123456',
        status: 'failed',
        errorCode: '30003',
        errorMessage: 'Unreachable destination',
      });
    });
  });

  describe('WHATSAPP_TEMPLATES', () => {
    it('should have OTP template', () => {
      const template = WHATSAPP_TEMPLATES['OTP'];
      expect(template).toBeDefined();
      const result = template.body({ otp: '123456' });
      expect(result).toContain('123456');
      expect(result).toContain('verification code');
    });

    it('should have BOOKING_ACCEPTED template', () => {
      const template = WHATSAPP_TEMPLATES['BOOKING_ACCEPTED'];
      expect(template).toBeDefined();
      const result = template.body({
        providerName: 'Dr. Smith',
        scheduledTime: '10:00 AM',
      });
      expect(result).toContain('Dr. Smith');
      expect(result).toContain('Confirmed');
    });

    it('should have PROVIDER_ON_THE_WAY template', () => {
      const template = WHATSAPP_TEMPLATES['PROVIDER_ON_THE_WAY'];
      expect(template).toBeDefined();
      const result = template.body({
        providerName: 'Dr. Smith',
        eta: '15',
      });
      expect(result).toContain('Dr. Smith');
      expect(result).toContain('15');
    });

    it('should have LAB_RESULT_READY template', () => {
      const template = WHATSAPP_TEMPLATES['LAB_RESULT_READY'];
      expect(template).toBeDefined();
      const result = template.body({ testType: 'Blood Test' });
      expect(result).toContain('Blood Test');
      expect(result).toContain('Ready');
    });

    it('should have PAYMENT_SUCCESS template', () => {
      const template = WHATSAPP_TEMPLATES['PAYMENT_SUCCESS'];
      expect(template).toBeDefined();
      const result = template.body({ amount: '500' });
      expect(result).toContain('500');
      expect(result).toContain('Payment');
    });

    it('should have APPOINTMENT_REMINDER template', () => {
      const template = WHATSAPP_TEMPLATES['APPOINTMENT_REMINDER'];
      expect(template).toBeDefined();
      const result = template.body({
        providerName: 'Dr. Smith',
        scheduledTime: 'Apr 15, 10 AM',
      });
      expect(result).toContain('Reminder');
      expect(result).toContain('Dr. Smith');
    });

    it('should have PRESCRIPTION_UPLOADED template', () => {
      const template = WHATSAPP_TEMPLATES['PRESCRIPTION_UPLOADED'];
      expect(template).toBeDefined();
      const result = template.body({ providerName: 'Dr. Smith' });
      expect(result).toContain('Prescription');
      expect(result).toContain('Dr. Smith');
    });

    it('should have DIAGNOSTIC_BOOKED template', () => {
      const template = WHATSAPP_TEMPLATES['DIAGNOSTIC_BOOKED'];
      expect(template).toBeDefined();
      const result = template.body({
        testType: 'MRI Scan',
        scheduledTime: 'Tomorrow 2 PM',
      });
      expect(result).toContain('MRI Scan');
      expect(result).toContain('Diagnostic');
    });

    it('should have PROVIDER_APPROVED template', () => {
      const template = WHATSAPP_TEMPLATES['PROVIDER_APPROVED'];
      expect(template).toBeDefined();
      const result = template.body({});
      expect(result).toContain('approved');
      expect(result).toContain('Congratulations');
    });
  });
});

describe('WhatsAppService with Twilio configured', () => {
  let service: WhatsAppService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, string> = {
          TWILIO_ACCOUNT_SID: 'test_sid',
          TWILIO_AUTH_TOKEN: 'test_token',
          TWILIO_WHATSAPP_NUMBER: 'whatsapp:+919876543210',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WhatsAppService>(WhatsAppService);
  });

  it('should return enabled when Twilio credentials are configured', () => {
    expect(service.isEnabled()).toBe(true);
  });

  it('should return false for sandbox when using production number', () => {
    expect(service.isSandbox()).toBe(false);
  });
});

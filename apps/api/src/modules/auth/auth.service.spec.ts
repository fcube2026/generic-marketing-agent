import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            otpVerification: {
              updateMany: jest.fn(),
              create: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendOtp', () => {
    it('should invalidate old OTPs and create a new one', async () => {
      (prisma.otpVerification.updateMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      (prisma.otpVerification.create as jest.Mock).mockResolvedValue({
        id: 'otp-1',
        phone: '+1234567890',
        otp: '123456',
        verified: false,
      });

      const result = await service.sendOtp({ phone: '+1234567890' });

      expect(result.success).toBe(true);
      expect(result.message).toBe('OTP sent successfully');
      expect(prisma.otpVerification.updateMany).toHaveBeenCalledWith({
        where: { phone: '+1234567890', verified: false },
        data: { verified: true },
      });
      expect(prisma.otpVerification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          phone: '+1234567890',
          otp: expect.any(String),
          expiresAt: expect.any(Date),
          verified: false,
        }),
      });
    });

    it('should return OTP in non-production environment', async () => {
      (prisma.otpVerification.updateMany as jest.Mock).mockResolvedValue({
        count: 0,
      });
      (prisma.otpVerification.create as jest.Mock).mockResolvedValue({
        id: 'otp-1',
      });

      const result = await service.sendOtp({ phone: '+1234567890' });

      expect(result.otp).toBeDefined();
      expect(result.otp).toMatch(/^\d{6}$/);
    });
  });

  describe('verifyOtp', () => {
    const mockUser = {
      id: 'user-1',
      phone: '+1234567890',
      role: 'PATIENT',
    };

    it('should verify OTP and return token for existing user', async () => {
      (prisma.otpVerification.findFirst as jest.Mock).mockResolvedValue({
        id: 'otp-1',
        phone: '+1234567890',
        otp: '123456',
        verified: false,
      });
      (prisma.otpVerification.update as jest.Mock).mockResolvedValue({});
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.verifyOtp({
        phone: '+1234567890',
        otp: '123456',
      });

      expect(result.token).toBe('mock-jwt-token');
      expect(result.user).toEqual(mockUser);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        phone: '+1234567890',
        role: 'PATIENT',
      });
      expect(prisma.otpVerification.update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { verified: true },
      });
    });

    it('should create new user if not found', async () => {
      (prisma.otpVerification.findFirst as jest.Mock).mockResolvedValue({
        id: 'otp-1',
        phone: '+1234567890',
        otp: '123456',
        verified: false,
      });
      (prisma.otpVerification.update as jest.Mock).mockResolvedValue({});
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.verifyOtp({
        phone: '+1234567890',
        otp: '123456',
      });

      expect(result.token).toBe('mock-jwt-token');
      expect(result.user).toEqual(mockUser);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          phone: '+1234567890',
          role: 'PATIENT',
        },
      });
    });

    it('should create user with specified role', async () => {
      const providerUser = { ...mockUser, role: 'PROVIDER' };
      (prisma.otpVerification.findFirst as jest.Mock).mockResolvedValue({
        id: 'otp-1',
        phone: '+1234567890',
        otp: '123456',
        verified: false,
      });
      (prisma.otpVerification.update as jest.Mock).mockResolvedValue({});
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(providerUser);

      const result = await service.verifyOtp({
        phone: '+1234567890',
        otp: '123456',
        role: 'PROVIDER',
      });

      expect(result.user.role).toBe('PROVIDER');
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          phone: '+1234567890',
          role: 'PROVIDER',
        },
      });
    });

    it('should throw UnauthorizedException for invalid OTP', async () => {
      (prisma.otpVerification.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.verifyOtp({ phone: '+1234567890', otp: '000000' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../email/email.service';

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: any;
  let mockJwtService: any;

  beforeEach(async () => {
    mockPrisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      otpVerification: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      passwordResetToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest
        .fn()
        .mockImplementation((ops: any[]) => Promise.all(ops)),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        {
          provide: EmailService,
          useValue: { sendPasswordResetEmail: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('adminLogin', () => {
    const validDto = { email: 'admin@curex24.com', password: 'admin123' };

    const mockAdminUser = {
      id: 'admin-user-id',
      phone: '+0000000000',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return token for valid credentials when admin user exists', async () => {
      mockPrisma.user.upsert.mockResolvedValue(mockAdminUser);

      const result = await service.adminLogin(validDto);

      expect(result).toEqual({
        token: 'mock-jwt-token',
        user: {
          id: 'admin-user-id',
          email: 'admin@curex24.com',
          role: 'ADMIN',
        },
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'admin-user-id',
        phone: '+0000000000',
        role: 'ADMIN',
      });
    });

    it('should create admin user if not found and return token', async () => {
      mockPrisma.user.upsert.mockResolvedValue(mockAdminUser);

      const result = await service.adminLogin(validDto);

      expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
        where: { phone: '+0000000000' },
        create: { phone: '+0000000000', role: 'ADMIN' },
        update: { role: 'ADMIN' },
      });
      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.role).toBe('ADMIN');
    });

    it('should throw UnauthorizedException for wrong email', async () => {
      await expect(
        service.adminLogin({ email: 'wrong@email.com', password: 'admin123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      await expect(
        service.adminLogin({ email: 'admin@curex24.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for both wrong credentials', async () => {
      await expect(
        service.adminLogin({ email: 'wrong@email.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ServiceUnavailableException when DB upsert fails', async () => {
      mockPrisma.user.upsert.mockRejectedValue(new Error('DB connection lost'));

      await expect(service.adminLogin(validDto)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should still fall back to hardcoded creds when DB lookup fails', async () => {
      mockPrisma.user.findFirst.mockRejectedValue(
        new Error('column "email" does not exist'),
      );
      mockPrisma.user.upsert.mockResolvedValue(mockAdminUser);

      const result = await service.adminLogin(validDto);

      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.role).toBe('ADMIN');
    });
  });

  describe('marketingLogin', () => {
    const validDto = {
      email: 'marketing@curex24.com',
      password: 'marketing123',
    };

    const mockMarketingUser = {
      id: 'marketing-user-id',
      phone: '+0000000001',
      email: 'marketing@curex24.com',
      role: 'MARKETING_AGENT',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return token for valid credentials via env-var fallback', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.upsert.mockResolvedValue(mockMarketingUser);

      const result = await service.marketingLogin(validDto);

      expect(result).toEqual({
        token: 'mock-jwt-token',
        user: {
          id: 'marketing-user-id',
          email: 'marketing@curex24.com',
          role: 'MARKETING_AGENT',
        },
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'marketing-user-id',
        phone: '+0000000001',
        role: 'MARKETING_AGENT',
      });
    });

    it('should upsert marketing agent user with email and MARKETING_AGENT role', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.upsert.mockResolvedValue(mockMarketingUser);

      await service.marketingLogin(validDto);

      expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
        where: { phone: '+0000000001' },
        create: {
          phone: '+0000000001',
          email: 'marketing@curex24.com',
          role: 'MARKETING_AGENT',
        },
        update: { role: 'MARKETING_AGENT' },
      });
    });

    it('should authenticate via DB-stored passwordHash when user exists', async () => {
      const hash = await bcrypt.hash('marketing123', 10);
      const dbUser = {
        ...mockMarketingUser,
        passwordHash: hash,
        isActive: true,
      };
      mockPrisma.user.findFirst.mockResolvedValue(dbUser);

      const result = await service.marketingLogin(validDto);

      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.role).toBe('MARKETING_AGENT');
      // Should use DB path — upsert should NOT be called
      expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when DB password does not match', async () => {
      const hash = await bcrypt.hash('different-password', 10);
      mockPrisma.user.findFirst.mockResolvedValue({
        ...mockMarketingUser,
        passwordHash: hash,
        isActive: true,
      });

      await expect(
        service.marketingLogin({
          email: 'marketing@curex24.com',
          password: 'marketing123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for deactivated DB user', async () => {
      const hash = await bcrypt.hash('marketing123', 10);
      mockPrisma.user.findFirst.mockResolvedValue({
        ...mockMarketingUser,
        passwordHash: hash,
        isActive: false,
      });

      await expect(service.marketingLogin(validDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should fall back to env-var check when DB lookup fails', async () => {
      mockPrisma.user.findFirst.mockRejectedValue(
        new Error('column "email" does not exist'),
      );
      mockPrisma.user.upsert.mockResolvedValue(mockMarketingUser);

      const result = await service.marketingLogin(validDto);

      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.role).toBe('MARKETING_AGENT');
    });

    it('should throw UnauthorizedException for wrong email', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.marketingLogin({
          email: 'wrong@email.com',
          password: 'marketing123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.marketingLogin({
          email: 'marketing@curex24.com',
          password: 'wrong',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should accept admin credentials and return ADMIN role token', async () => {
      const mockAdminUser = {
        id: 'admin-user-id',
        phone: '+0000000000',
        email: 'admin@curex24.com',
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.upsert.mockResolvedValue(mockAdminUser);

      const result = await service.marketingLogin({
        email: 'admin@curex24.com',
        password: 'admin123',
      });

      expect(result).toEqual({
        token: 'mock-jwt-token',
        user: {
          id: 'admin-user-id',
          email: 'admin@curex24.com',
          role: 'ADMIN',
        },
      });
      expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
        where: { phone: '+0000000000' },
        create: { phone: '+0000000000', role: 'ADMIN' },
        update: { role: 'ADMIN' },
      });
    });

    it('should throw ServiceUnavailableException when DB upsert fails', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.upsert.mockRejectedValue(new Error('DB connection lost'));

      await expect(service.marketingLogin(validDto)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });
});

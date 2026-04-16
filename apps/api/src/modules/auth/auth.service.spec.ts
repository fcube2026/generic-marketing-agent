import { Test, TestingModule } from '@nestjs/testing';
import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';

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
      },
      otpVerification: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
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
      role: 'MARKETING_AGENT',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return token for valid credentials', async () => {
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

    it('should upsert marketing agent user with MARKETING_AGENT role', async () => {
      mockPrisma.user.upsert.mockResolvedValue(mockMarketingUser);

      await service.marketingLogin(validDto);

      expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
        where: { phone: '+0000000001' },
        create: { phone: '+0000000001', role: 'MARKETING_AGENT' },
        update: { role: 'MARKETING_AGENT' },
      });
    });

    it('should throw UnauthorizedException for wrong email', async () => {
      await expect(
        service.marketingLogin({
          email: 'wrong@email.com',
          password: 'marketing123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
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
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
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
      mockPrisma.user.upsert.mockRejectedValue(new Error('DB connection lost'));

      await expect(service.marketingLogin(validDto)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });
});

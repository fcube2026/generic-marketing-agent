import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
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
      mockPrisma.user.findFirst.mockResolvedValue(mockAdminUser);

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
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockAdminUser);

      const result = await service.adminLogin(validDto);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          phone: '+0000000000',
          role: 'ADMIN',
        },
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
  });
});

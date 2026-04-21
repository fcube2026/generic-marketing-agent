import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    sendOtp: jest.fn(),
    verifyOtp: jest.fn(),
    adminLogin: jest.fn(),
    marketingLogin: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('adminLogin', () => {
    it('should call authService.adminLogin with the dto', async () => {
      const dto = { email: 'admin@curex24.com', password: 'admin123' };
      const expected = {
        token: 'mock-jwt-token',
        user: { id: 'admin-id', email: 'admin@curex24.com', role: 'ADMIN' },
      };

      mockAuthService.adminLogin.mockResolvedValue(expected);

      const result = await controller.adminLogin(dto);

      expect(result).toEqual(expected);
      expect(mockAuthService.adminLogin).toHaveBeenCalledWith(dto);
    });
  });

  describe('marketingLogin', () => {
    it('should call authService.marketingLogin with the dto', async () => {
      const dto = { email: 'marketing@curex24.com', password: 'marketing123' };
      const expected = {
        token: 'mock-jwt-token',
        user: {
          id: 'marketing-id',
          email: 'marketing@curex24.com',
          role: 'MARKETING_AGENT',
        },
      };

      mockAuthService.marketingLogin.mockResolvedValue(expected);

      const result = await controller.marketingLogin(dto);

      expect(result).toEqual(expected);
      expect(mockAuthService.marketingLogin).toHaveBeenCalledWith(dto);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            sendOtp: jest.fn(),
            verifyOtp: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendOtp', () => {
    it('should call authService.sendOtp with dto', async () => {
      const dto = { phone: '+1234567890' };
      const expected = { success: true, message: 'OTP sent successfully', otp: '123456' };
      (authService.sendOtp as jest.Mock).mockResolvedValue(expected);

      const result = await controller.sendOtp(dto);

      expect(result).toEqual(expected);
      expect(authService.sendOtp).toHaveBeenCalledWith(dto);
    });
  });

  describe('verifyOtp', () => {
    it('should call authService.verifyOtp with dto', async () => {
      const dto = { phone: '+1234567890', otp: '123456' };
      const expected = {
        token: 'mock-jwt-token',
        user: { id: 'user-1', phone: '+1234567890', role: 'PATIENT' },
      };
      (authService.verifyOtp as jest.Mock).mockResolvedValue(expected);

      const result = await controller.verifyOtp(dto);

      expect(result).toEqual(expected);
      expect(authService.verifyOtp).toHaveBeenCalledWith(dto);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: PaymentsService;

  const mockPayment = {
    id: 'payment-1',
    bookingId: 'booking-1',
    amount: 500,
    status: 'PENDING',
    transactionId: 'TXN_123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            initiatePayment: jest.fn().mockResolvedValue(mockPayment),
            getPaymentStatus: jest.fn().mockResolvedValue(mockPayment),
            updatePaymentStatus: jest
              .fn()
              .mockResolvedValue({ ...mockPayment, status: 'PAID' }),
          },
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('initiatePayment', () => {
    it('should call service.initiatePayment with dto and user id', async () => {
      const dto = { bookingId: 'booking-1', amount: 500 };
      const user = { id: 'user-1' };
      const result = await controller.initiatePayment(dto, user);

      expect(service.initiatePayment).toHaveBeenCalledWith(dto, 'user-1');
      expect(result).toEqual(mockPayment);
    });
  });

  describe('getPaymentStatus', () => {
    it('should call service.getPaymentStatus with bookingId and user id', async () => {
      const user = { id: 'user-1' };
      const result = await controller.getPaymentStatus('booking-1', user);

      expect(service.getPaymentStatus).toHaveBeenCalledWith(
        'booking-1',
        'user-1',
      );
      expect(result).toEqual(mockPayment);
    });
  });

  describe('updatePaymentStatus', () => {
    it('should call service.updatePaymentStatus with id, dto, and user id', async () => {
      const dto = { status: 'PAID', transactionId: 'TXN_456' };
      const user = { id: 'user-1' };
      const result = await controller.updatePaymentStatus(
        'payment-1',
        dto,
        user,
      );

      expect(service.updatePaymentStatus).toHaveBeenCalledWith(
        'payment-1',
        dto,
        'user-1',
      );
      expect(result.status).toBe('PAID');
    });
  });
});

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
    it('should call service.initiatePayment with dto', async () => {
      const dto = { bookingId: 'booking-1', amount: 500 };
      const result = await controller.initiatePayment(dto);

      expect(service.initiatePayment).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockPayment);
    });
  });

  describe('getPaymentStatus', () => {
    it('should call service.getPaymentStatus with bookingId', async () => {
      const result = await controller.getPaymentStatus('booking-1');

      expect(service.getPaymentStatus).toHaveBeenCalledWith('booking-1');
      expect(result).toEqual(mockPayment);
    });
  });

  describe('updatePaymentStatus', () => {
    it('should call service.updatePaymentStatus with id and dto', async () => {
      const dto = { status: 'PAID', transactionId: 'TXN_456' };
      const result = await controller.updatePaymentStatus('payment-1', dto);

      expect(service.updatePaymentStatus).toHaveBeenCalledWith(
        'payment-1',
        dto,
      );
      expect(result.status).toBe('PAID');
    });
  });
});

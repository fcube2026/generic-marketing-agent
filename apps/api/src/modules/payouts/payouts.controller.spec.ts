import { Test, TestingModule } from '@nestjs/testing';
import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';

describe('PayoutsController', () => {
  let controller: PayoutsController;
  let service: PayoutsService;

  const mockPayouts = [
    {
      id: 'payout-1',
      providerId: 'provider-1',
      bookingId: 'booking-1',
      amount: 800,
      status: 'PENDING',
      createdAt: new Date(),
      booking: {
        patient: { name: 'John' },
        serviceCategory: { name: 'General' },
      },
    },
  ];

  const mockSummary = {
    totalEarnings: 2600,
    pendingAmount: 1400,
    processedAmount: 1200,
    totalPayouts: 3,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayoutsController],
      providers: [
        {
          provide: PayoutsService,
          useValue: {
            getProviderPayouts: jest.fn().mockResolvedValue(mockPayouts),
            getProviderEarningsSummary: jest
              .fn()
              .mockResolvedValue(mockSummary),
          },
        },
      ],
    }).compile();

    controller = module.get<PayoutsController>(PayoutsController);
    service = module.get<PayoutsService>(PayoutsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyPayouts', () => {
    it('should call service.getProviderPayouts with user id', async () => {
      const user = { id: 'user-1' };

      const result = await controller.getMyPayouts(user);

      expect(result).toEqual(mockPayouts);
      expect(service.getProviderPayouts).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getMyEarningsSummary', () => {
    it('should call service.getProviderEarningsSummary with user id', async () => {
      const user = { id: 'user-1' };

      const result = await controller.getMyEarningsSummary(user);

      expect(result).toEqual(mockSummary);
      expect(service.getProviderEarningsSummary).toHaveBeenCalledWith('user-1');
    });
  });
});

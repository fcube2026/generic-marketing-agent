import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('PayoutsService', () => {
  let service: PayoutsService;

  const mockPrisma = {
    providerProfile: {
      findUnique: jest.fn(),
    },
    payout: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PayoutsService>(PayoutsService);
    jest.clearAllMocks();
  });

  describe('getProviderPayouts', () => {
    it('should return payouts for a provider', async () => {
      const mockProfile = { id: 'provider-1', userId: 'user-1' };
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

      mockPrisma.providerProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.payout.findMany.mockResolvedValue(mockPayouts);

      const result = await service.getProviderPayouts('user-1');

      expect(result).toEqual(mockPayouts);
      expect(mockPrisma.providerProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(mockPrisma.payout.findMany).toHaveBeenCalledWith({
        where: { providerId: 'provider-1' },
        include: {
          booking: {
            include: {
              patient: true,
              serviceCategory: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw NotFoundException if provider not found', async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getProviderPayouts('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getProviderEarningsSummary', () => {
    it('should return correct earnings summary', async () => {
      const mockProfile = { id: 'provider-1', userId: 'user-1' };

      mockPrisma.providerProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.payout.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 2600 }, _count: 3 })
        .mockResolvedValueOnce({ _sum: { amount: 1400 } })
        .mockResolvedValueOnce({ _sum: { amount: 1200 } });

      const result = await service.getProviderEarningsSummary('user-1');

      expect(result).toEqual({
        totalEarnings: 2600,
        pendingAmount: 1400,
        processedAmount: 1200,
        totalPayouts: 3,
      });
    });

    it('should return zero summary when no payouts exist', async () => {
      const mockProfile = { id: 'provider-1', userId: 'user-1' };
      mockPrisma.providerProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.payout.aggregate.mockResolvedValue({
        _sum: { amount: null },
        _count: 0,
      });

      const result = await service.getProviderEarningsSummary('user-1');

      expect(result).toEqual({
        totalEarnings: 0,
        pendingAmount: 0,
        processedAmount: 0,
        totalPayouts: 0,
      });
    });

    it('should throw NotFoundException if provider not found', async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.getProviderEarningsSummary('unknown'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

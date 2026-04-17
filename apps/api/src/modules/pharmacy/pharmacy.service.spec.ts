import { PharmacyService } from './pharmacy.service';
import { PharmacyPartnerProvider } from './providers/pharmacy-partner.interface';

describe('PharmacyService', () => {
  const mockPrisma = {
    pharmacyPartner: {
      findMany: jest.fn(),
    },
  } as any;

  const mockProvider: PharmacyPartnerProvider = {
    searchMedicines: jest.fn().mockResolvedValue([
      {
        id: 'med-1',
        name: 'Paracetamol 500',
        price: 12,
      },
    ]),
    checkAvailability: jest.fn().mockResolvedValue({
      medicineCode: 'med-1',
      pincode: '560001',
      available: true,
    }),
    createOrder: jest.fn(),
    getOrderStatus: jest.fn(),
    cancelOrder: jest.fn(),
  };

  let service: PharmacyService;

  beforeEach(() => {
    service = new PharmacyService(
      mockPrisma,
      new Map<string, PharmacyPartnerProvider>([['mock', mockProvider]]),
    );
    jest.clearAllMocks();
  });

  it('searches a targeted provider and enriches availability', async () => {
    const results = await service.searchMedicines(
      'paracetamol',
      '560001',
      'mock',
    );

    expect(mockProvider.searchMedicines).toHaveBeenCalledWith('paracetamol');
    expect(mockProvider.checkAvailability).toHaveBeenCalledWith(
      'med-1',
      '560001',
    );
    expect(results).toHaveLength(1);
    expect(results[0].availability?.available).toBe(true);
  });

  it('lists active partners with provider registration info', async () => {
    mockPrisma.pharmacyPartner.findMany.mockResolvedValue([
      {
        id: 'partner-1',
        code: 'mock',
        name: 'Mock',
        displayName: 'Mock Partner',
        description: null,
        logoUrl: null,
        priority: 0,
      },
    ]);

    const partners = await service.listPartners();

    expect(partners).toEqual([
      expect.objectContaining({
        code: 'mock',
        registered: true,
      }),
    ]);
  });
});

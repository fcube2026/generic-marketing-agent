import { PharmacyService } from './pharmacy.service';
import { PharmacyPartnerProvider } from './providers/pharmacy-partner.interface';

describe('PharmacyService', () => {
  const mockPrisma = {
    pharmacyPartner: {
      findFirst: jest.fn(),
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
      new Map<string, PharmacyPartnerProvider>([
        ['testprovider', mockProvider],
      ]),
    );
    jest.clearAllMocks();
  });

  it('searches a targeted provider and enriches availability', async () => {
    mockPrisma.pharmacyPartner.findFirst.mockResolvedValue({
      id: 'partner-1',
      code: 'testprovider',
      name: 'testprovider',
      isActive: true,
    });

    const results = await service.searchMedicines(
      'paracetamol',
      '560001',
      'testprovider',
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
        code: 'testprovider',
        name: 'testprovider',
        displayName: 'Test Provider',
        description: null,
        logoUrl: null,
        priority: 0,
      },
    ]);

    const partners = await service.listPartners();

    expect(partners).toEqual([
      expect.objectContaining({
        code: 'testprovider',
        registered: true,
      }),
    ]);
  });

  it('allows the mock provider for development medicine search', async () => {
    mockPrisma.pharmacyPartner.findFirst.mockResolvedValue({
      id: 'partner-1',
      code: 'mock',
      name: 'mock',
      isActive: true,
    });

    const serviceWithMock = new PharmacyService(
      mockPrisma,
      new Map<string, PharmacyPartnerProvider>([['mock', mockProvider]]),
    );

    const results = await serviceWithMock.searchMedicines(
      'paracetamol',
      undefined,
      'mock',
    );

    expect(mockProvider.searchMedicines).toHaveBeenCalledWith('paracetamol');
    expect(results).toEqual([
      expect.objectContaining({
        id: 'med-1',
        name: 'Paracetamol 500',
      }),
    ]);
  });

  it('enforces Rx=true when same molecule is mixed OTC and Rx from one provider', async () => {
    const mixedProvider: PharmacyPartnerProvider = {
      ...mockProvider,
      searchMedicines: jest.fn().mockResolvedValue([
        {
          id: 'med-gaba-10',
          name: 'Gabapentin 10mg',
          price: 120,
          requiresPrescription: true,
        },
        {
          id: 'med-gaba-20',
          name: 'Gabapentin 20mg',
          price: 180,
          requiresPrescription: false,
        },
      ]),
    };

    mockPrisma.pharmacyPartner.findFirst.mockResolvedValue({
      id: 'partner-1',
      code: 'mock',
      name: 'mock',
      isActive: true,
    });

    const serviceWithMixedProvider = new PharmacyService(
      mockPrisma,
      new Map<string, PharmacyPartnerProvider>([['mock', mixedProvider]]),
    );

    const results = await serviceWithMixedProvider.searchMedicines(
      'gabapentin',
      undefined,
      'mock',
    );

    expect(results).toHaveLength(2);
    expect(results.every((m) => m.requiresPrescription === true)).toBe(true);
  });

  it('enforces Rx=true when same molecule is mixed across providers', async () => {
    const providerA: PharmacyPartnerProvider = {
      ...mockProvider,
      searchMedicines: jest.fn().mockResolvedValue([
        {
          id: 'med-gaba-a',
          name: 'Gabapentin 10mg',
          price: 120,
          requiresPrescription: false,
        },
      ]),
    };

    const providerB: PharmacyPartnerProvider = {
      ...mockProvider,
      searchMedicines: jest.fn().mockResolvedValue([
        {
          id: 'med-gaba-b',
          name: 'Gabapentin 20mg',
          price: 180,
          requiresPrescription: true,
        },
      ]),
    };

    mockPrisma.pharmacyPartner.findMany.mockResolvedValue([
      {
        id: 'partner-a',
        code: 'a',
        name: 'a',
        isActive: true,
        priority: 1,
        displayName: 'A',
      },
      {
        id: 'partner-b',
        code: 'b',
        name: 'b',
        isActive: true,
        priority: 2,
        displayName: 'B',
      },
    ]);

    const serviceWithMultipleProviders = new PharmacyService(
      mockPrisma,
      new Map<string, PharmacyPartnerProvider>([
        ['a', providerA],
        ['b', providerB],
      ]),
    );

    const results =
      await serviceWithMultipleProviders.searchMedicines('gabapentin');

    expect(results).toHaveLength(2);
    expect(results.every((m) => m.requiresPrescription === true)).toBe(true);
  });
});

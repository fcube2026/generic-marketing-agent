import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PharmacyOrderStatus, Role } from '@prisma/client';
import { PharmacyOrderService } from './pharmacy-order.service';
import { PharmacyPartnerProvider } from './providers/pharmacy-partner.interface';

describe('PharmacyOrderService', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    patientProfile: {
      findUnique: jest.fn(),
    },
    pharmacyPartner: {
      findFirst: jest.fn(),
    },
    address: {
      findFirst: jest.fn(),
    },
    pharmacyOrder: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  } as any;

  const mockProvider: PharmacyPartnerProvider = {
    searchMedicines: jest.fn(),
    checkAvailability: jest.fn(),
    createOrder: jest.fn().mockResolvedValue({
      partnerOrderId: 'partner-order-1',
      status: 'PENDING',
      totalAmount: 50,
      items: [],
    }),
    getOrderStatus: jest.fn().mockResolvedValue({
      partnerOrderId: 'partner-order-1',
      status: 'CONFIRMED',
    }),
    cancelOrder: jest.fn().mockResolvedValue({
      partnerOrderId: 'partner-order-1',
      status: 'CANCELLED',
      cancelled: true,
    }),
  };

  const mockPrescriptionService = {
    assertPrescriptionApproved: jest.fn(),
  } as any;

  let service: PharmacyOrderService;

  beforeEach(() => {
    service = new PharmacyOrderService(
      mockPrisma,
      new Map<string, PharmacyPartnerProvider>([['mock', mockProvider]]),
      mockPrescriptionService,
      {
        getSignedUrl: jest.fn().mockResolvedValue('https://signed.test/url'),
      } as any,
    );
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({ role: Role.PATIENT });
    mockPrisma.patientProfile.findUnique.mockResolvedValue({
      id: 'patient-profile-1',
      userId: 'user-1',
    });
  });

  it('creates an order using the current Prisma schema fields', async () => {
    mockPrisma.pharmacyPartner.findFirst.mockResolvedValue({
      id: 'partner-1',
      code: 'mock',
      name: 'Mock',
      displayName: 'Mock Partner',
      isActive: true,
    });
    mockPrisma.address.findFirst.mockResolvedValue({
      id: 'address-1',
      userId: 'user-1',
      addressLine: 'Street 1',
      city: 'Bengaluru',
      state: 'KA',
      pincode: '560001',
    });
    mockPrisma.pharmacyOrder.create.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'PHARM-TEST',
      patientProfileId: 'patient-profile-1',
      bookingId: null,
      prescriptionId: null,
      pharmacyPartnerId: 'partner-1',
      partnerOrderId: 'partner-order-1',
      status: PharmacyOrderStatus.PENDING,
      deliveryAddressId: 'address-1',
      prescriptionImageUrl: null,
      subtotal: 120,
      deliveryFee: 40,
      discount: 0,
      totalAmount: 160,
      estimatedDeliveryAt: null,
      deliveredAt: null,
      notes: null,
      createdAt: new Date('2026-04-16T00:00:00Z'),
      updatedAt: new Date('2026-04-16T00:00:00Z'),
      deliveryAddress: {
        addressLine: 'Street 1',
        city: 'Bengaluru',
        state: 'KA',
        pincode: '560001',
      },
      pharmacyPartner: {
        id: 'partner-1',
        code: 'mock',
        name: 'Mock',
        displayName: 'Mock Partner',
      },
      items: [
        {
          id: 'item-1',
          medicineCode: 'med-1',
          medicineName: 'Paracetamol',
          dosage: null,
          instructions: null,
          isSubstitute: false,
          quantity: 2,
          unitPrice: 60,
          totalPrice: 120,
          pharmacyOrderId: 'order-1',
        },
      ],
    });

    const result = await service.placeOrder('user-1', {
      partnerId: 'partner-1',
      deliveryAddressId: 'address-1',
      items: [
        {
          medicineCode: 'med-1',
          medicineName: 'Paracetamol',
          quantity: 2,
          unitPrice: 60,
        },
      ],
    });

    expect(mockProvider.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: 'patient-profile-1',
        deliveryAddress: 'Street 1, Bengaluru, KA, 560001',
      }),
    );
    expect(mockPrisma.pharmacyOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          patientProfileId: 'patient-profile-1',
          pharmacyPartnerId: 'partner-1',
          deliveryAddressId: 'address-1',
          subtotal: 120,
          deliveryFee: 40,
          totalAmount: 160,
        }),
      }),
    );
    expect(result.pharmacyPartnerId).toBe('partner-1');
  });

  it('uses free delivery for baskets at or above Rs 450', async () => {
    mockPrisma.pharmacyPartner.findFirst.mockResolvedValue({
      id: 'partner-1',
      code: 'mock',
      name: 'Mock',
      displayName: 'Mock Partner',
      isActive: true,
    });
    mockPrisma.address.findFirst.mockResolvedValue({
      id: 'address-1',
      userId: 'user-1',
      addressLine: 'Street 1',
      city: 'Bengaluru',
      state: 'KA',
      pincode: '560001',
    });
    mockPrisma.pharmacyOrder.create.mockResolvedValue({
      id: 'order-2',
      orderNumber: 'PHARM-TEST-2',
      patientProfileId: 'patient-profile-1',
      bookingId: null,
      prescriptionId: null,
      pharmacyPartnerId: 'partner-1',
      partnerOrderId: 'partner-order-1',
      status: PharmacyOrderStatus.PENDING,
      deliveryAddressId: 'address-1',
      prescriptionImageUrl: null,
      subtotal: 450,
      deliveryFee: 0,
      discount: 0,
      totalAmount: 450,
      estimatedDeliveryAt: null,
      deliveredAt: null,
      notes: null,
      createdAt: new Date('2026-04-16T00:00:00Z'),
      updatedAt: new Date('2026-04-16T00:00:00Z'),
      deliveryAddress: {
        addressLine: 'Street 1',
        city: 'Bengaluru',
        state: 'KA',
        pincode: '560001',
      },
      pharmacyPartner: {
        id: 'partner-1',
        code: 'mock',
        name: 'Mock',
        displayName: 'Mock Partner',
      },
      items: [],
    });

    await service.placeOrder('user-1', {
      partnerId: 'partner-1',
      deliveryAddressId: 'address-1',
      items: [
        {
          medicineCode: 'med-1',
          medicineName: 'Paracetamol',
          quantity: 5,
          unitPrice: 90,
        },
      ],
    });

    expect(mockPrisma.pharmacyOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subtotal: 450,
          deliveryFee: 0,
          totalAmount: 450,
        }),
      }),
    );
  });

  it('charges Rs 25 delivery for baskets from Rs 250 to Rs 449', async () => {
    mockPrisma.pharmacyPartner.findFirst.mockResolvedValue({
      id: 'partner-1',
      code: 'mock',
      name: 'Mock',
      displayName: 'Mock Partner',
      isActive: true,
    });
    mockPrisma.address.findFirst.mockResolvedValue({
      id: 'address-1',
      userId: 'user-1',
      addressLine: 'Street 1',
      city: 'Bengaluru',
      state: 'KA',
      pincode: '560001',
    });
    mockPrisma.pharmacyOrder.create.mockResolvedValue({
      id: 'order-3',
      orderNumber: 'PHARM-TEST-3',
      patientProfileId: 'patient-profile-1',
      bookingId: null,
      prescriptionId: null,
      pharmacyPartnerId: 'partner-1',
      partnerOrderId: 'partner-order-1',
      status: PharmacyOrderStatus.PENDING,
      deliveryAddressId: 'address-1',
      prescriptionImageUrl: null,
      subtotal: 250,
      deliveryFee: 25,
      discount: 0,
      totalAmount: 275,
      estimatedDeliveryAt: null,
      deliveredAt: null,
      notes: null,
      createdAt: new Date('2026-04-16T00:00:00Z'),
      updatedAt: new Date('2026-04-16T00:00:00Z'),
      deliveryAddress: {
        addressLine: 'Street 1',
        city: 'Bengaluru',
        state: 'KA',
        pincode: '560001',
      },
      pharmacyPartner: {
        id: 'partner-1',
        code: 'mock',
        name: 'Mock',
        displayName: 'Mock Partner',
      },
      items: [],
    });

    await service.placeOrder('user-1', {
      partnerId: 'partner-1',
      deliveryAddressId: 'address-1',
      items: [
        {
          medicineCode: 'med-1',
          medicineName: 'Paracetamol',
          quantity: 5,
          unitPrice: 50,
        },
      ],
    });

    expect(mockPrisma.pharmacyOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subtotal: 250,
          deliveryFee: 25,
          totalAmount: 275,
        }),
      }),
    );
  });

  it('allows low-value baskets and still places order', async () => {
    mockPrisma.pharmacyPartner.findFirst.mockResolvedValue({
      id: 'partner-1',
      code: 'mock',
      name: 'Mock',
      displayName: 'Mock Partner',
      isActive: true,
    });
    mockPrisma.address.findFirst.mockResolvedValue({
      id: 'address-1',
      userId: 'user-1',
      addressLine: 'Street 1',
      city: 'Bengaluru',
      state: 'KA',
      pincode: '560001',
    });
    mockPrisma.pharmacyOrder.create.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'PHARM-TEST-LOW',
      patientProfileId: 'patient-profile-1',
      bookingId: null,
      prescriptionId: null,
      uploadedPrescriptionId: null,
      pharmacyPartnerId: 'partner-1',
      partnerOrderId: 'partner-order-1',
      status: PharmacyOrderStatus.PENDING,
      paymentStatus: 'PAID',
      deliveryAddressId: 'address-1',
      prescriptionImageUrl: null,
      prescriptionUrl: null,
      subtotal: 4,
      deliveryFee: 20,
      discount: 0,
      totalAmount: 24,
      estimatedDeliveryAt: null,
      deliveredAt: null,
      notes: null,
      createdAt: new Date('2026-04-16T00:00:00Z'),
      updatedAt: new Date('2026-04-16T00:00:00Z'),
      deliveryAddress: {
        addressLine: 'Street 1',
        city: 'Bengaluru',
        state: 'KA',
        pincode: '560001',
      },
      pharmacyPartner: {
        id: 'partner-1',
        code: 'mock',
        name: 'Mock',
        displayName: 'Mock Partner',
      },
      items: [],
    });

    await service.placeOrder('user-1', {
      partnerId: 'partner-1',
      deliveryAddressId: 'address-1',
      items: [
        {
          medicineCode: 'med-1',
          medicineName: 'Paracetamol',
          quantity: 1,
          unitPrice: 4,
        },
      ],
    });

    expect(mockProvider.createOrder).toHaveBeenCalled();
    expect(mockPrisma.pharmacyOrder.create).toHaveBeenCalled();
  });

  it('enforces approval for uploaded prescriptions before creating an order', async () => {
    mockPrisma.pharmacyPartner.findFirst.mockResolvedValue({
      id: 'partner-1',
      code: 'mock',
      name: 'Mock',
      displayName: 'Mock Partner',
      isActive: true,
    });
    mockPrisma.address.findFirst.mockResolvedValue({
      id: 'address-1',
      userId: 'user-1',
      addressLine: 'Street 1',
      city: 'Bengaluru',
      state: 'KA',
      pincode: '560001',
    });
    mockPrisma.pharmacyOrder.create.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'PHARM-TEST',
      patientProfileId: 'patient-profile-1',
      bookingId: null,
      prescriptionId: null,
      uploadedPrescriptionId: 'upload-rx-1',
      pharmacyPartnerId: 'partner-1',
      partnerOrderId: 'partner-order-1',
      status: PharmacyOrderStatus.PENDING,
      deliveryAddressId: 'address-1',
      prescriptionImageUrl: null,
      subtotal: 120,
      deliveryFee: 40,
      discount: 0,
      totalAmount: 160,
      estimatedDeliveryAt: null,
      deliveredAt: null,
      notes: null,
      createdAt: new Date('2026-04-16T00:00:00Z'),
      updatedAt: new Date('2026-04-16T00:00:00Z'),
      deliveryAddress: {
        addressLine: 'Street 1',
        city: 'Bengaluru',
        state: 'KA',
        pincode: '560001',
      },
      pharmacyPartner: {
        id: 'partner-1',
        code: 'mock',
        name: 'Mock',
        displayName: 'Mock Partner',
      },
      items: [],
    });

    await service.placeOrder('user-1', {
      partnerId: 'partner-1',
      deliveryAddressId: 'address-1',
      uploadedPrescriptionId: 'upload-rx-1',
      items: [
        {
          medicineCode: 'med-1',
          medicineName: 'Paracetamol',
          quantity: 2,
          unitPrice: 60,
        },
      ],
    });

    expect(
      mockPrescriptionService.assertPrescriptionApproved,
    ).toHaveBeenCalledWith('upload-rx-1', 'user-1');
  });

  it('cancels an order through the provider when allowed', async () => {
    mockPrisma.pharmacyOrder.findFirst.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'PHARM-TEST',
      patientProfileId: 'patient-profile-1',
      bookingId: null,
      prescriptionId: null,
      pharmacyPartnerId: 'partner-1',
      partnerOrderId: 'partner-order-1',
      status: PharmacyOrderStatus.PENDING,
      deliveryAddressId: 'address-1',
      prescriptionImageUrl: null,
      subtotal: 50,
      deliveryFee: 20,
      discount: 0,
      totalAmount: 70,
      estimatedDeliveryAt: null,
      deliveredAt: null,
      notes: null,
      createdAt: new Date('2026-04-16T00:00:00Z'),
      updatedAt: new Date('2026-04-16T00:00:00Z'),
      deliveryAddress: {
        addressLine: 'Street 1',
        city: 'Bengaluru',
        state: 'KA',
        pincode: '560001',
      },
      pharmacyPartner: {
        id: 'partner-1',
        code: 'mock',
        name: 'Mock',
        displayName: 'Mock Partner',
      },
      items: [],
    });
    mockPrisma.pharmacyOrder.update.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'PHARM-TEST',
      patientProfileId: 'patient-profile-1',
      bookingId: null,
      prescriptionId: null,
      pharmacyPartnerId: 'partner-1',
      partnerOrderId: 'partner-order-1',
      status: PharmacyOrderStatus.CANCELLED,
      deliveryAddressId: 'address-1',
      prescriptionImageUrl: null,
      subtotal: 50,
      deliveryFee: 20,
      discount: 0,
      totalAmount: 70,
      estimatedDeliveryAt: null,
      deliveredAt: null,
      notes: null,
      createdAt: new Date('2026-04-16T00:00:00Z'),
      updatedAt: new Date('2026-04-16T00:00:00Z'),
      deliveryAddress: {
        addressLine: 'Street 1',
        city: 'Bengaluru',
        state: 'KA',
        pincode: '560001',
      },
      pharmacyPartner: {
        id: 'partner-1',
        code: 'mock',
        name: 'Mock',
        displayName: 'Mock Partner',
      },
      items: [],
    });

    const result = await service.cancelOrder('order-1', 'user-1');

    expect(mockProvider.cancelOrder).toHaveBeenCalledWith('partner-order-1');
    expect(result.status).toBe(PharmacyOrderStatus.CANCELLED);
  });

  it('rejects non-patient users', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: Role.ADMIN });

    await expect(service.listPatientOrders('user-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws when address is missing during order placement', async () => {
    mockPrisma.pharmacyPartner.findFirst.mockResolvedValue({
      id: 'partner-1',
      code: 'mock',
      name: 'Mock',
      displayName: 'Mock Partner',
      isActive: true,
    });
    mockPrisma.address.findFirst.mockResolvedValue(null);

    await expect(
      service.placeOrder('user-1', {
        partnerId: 'partner-1',
        deliveryAddressId: 'missing-address',
        items: [
          {
            medicineCode: 'med-1',
            medicineName: 'Paracetamol',
            quantity: 1,
            unitPrice: 25,
          },
        ],
      }),
    ).rejects.toThrow(NotFoundException);
  });
});

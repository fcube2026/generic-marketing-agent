import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DoctorVerificationService } from '../doctor-verification/doctor-verification.service';

describe('AdminService', () => {
  let service: AdminService;

  const mockPrisma = {
    providerProfile: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    providerLicense: {
      updateMany: jest.fn(),
    },
    adminAction: {
      create: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    booking: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      groupBy: jest.fn(),
    },
    patientProfile: {
      count: jest.fn(),
    },
    payment: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    diagnosticRequest: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    referral: {
      findMany: jest.fn(),
    },
    payout: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  const mockVerificationService = {
    getVerificationQueue: jest.fn(),
    retryVerification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: DoctorVerificationService,
          useValue: mockVerificationService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPendingProviders', () => {
    it('should return providers that are unverified and active', async () => {
      const pending = [
        { id: 'p1', name: 'Dr. A', isVerified: false, isActive: true },
        { id: 'p2', name: 'Dr. B', isVerified: false, isActive: true },
      ];
      mockPrisma.providerProfile.findMany.mockResolvedValue(pending);

      const result = await service.getPendingProviders();

      expect(result).toEqual(pending);
      expect(mockPrisma.providerProfile.findMany).toHaveBeenCalledWith({
        where: { isVerified: false, isActive: true },
        include: {
          user: true,
          licenses: true,
          providerServices: { include: { serviceCategory: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should return empty array when no pending providers', async () => {
      mockPrisma.providerProfile.findMany.mockResolvedValue([]);

      const result = await service.getPendingProviders();

      expect(result).toEqual([]);
    });
  });

  describe('getAllProviders', () => {
    it('should return pending providers when status is pending', async () => {
      const providers = [{ id: 'p1', isVerified: false, isActive: true }];
      mockPrisma.providerProfile.findMany.mockResolvedValue(providers);

      const result = await service.getAllProviders('pending');

      expect(result).toEqual(providers);
      expect(mockPrisma.providerProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isVerified: false, isActive: true },
        }),
      );
    });

    it('should return active providers when status is active', async () => {
      const providers = [{ id: 'p1', isVerified: true, isActive: true }];
      mockPrisma.providerProfile.findMany.mockResolvedValue(providers);

      const result = await service.getAllProviders('active');

      expect(result).toEqual(providers);
      expect(mockPrisma.providerProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isVerified: true, isActive: true },
        }),
      );
    });

    it('should return rejected providers when status is rejected', async () => {
      const providers = [{ id: 'p1', isVerified: false, isActive: false }];
      mockPrisma.providerProfile.findMany.mockResolvedValue(providers);

      const result = await service.getAllProviders('rejected');

      expect(result).toEqual(providers);
      expect(mockPrisma.providerProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isVerified: false, isActive: false },
        }),
      );
    });

    it('should return all providers when no status filter', async () => {
      const providers = [{ id: 'p1' }, { id: 'p2' }];
      mockPrisma.providerProfile.findMany.mockResolvedValue(providers);

      const result = await service.getAllProviders();

      expect(result).toEqual(providers);
      expect(mockPrisma.providerProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  describe('getProviderById', () => {
    it('should return provider with relations', async () => {
      const provider = {
        id: 'p1',
        name: 'Dr. A',
        user: { phone: '+1234567890' },
        licenses: [],
        providerServices: [],
      };
      mockPrisma.providerProfile.findUnique.mockResolvedValue(provider);

      const result = await service.getProviderById('p1');

      expect(result).toEqual(provider);
      expect(mockPrisma.providerProfile.findUnique).toHaveBeenCalledWith({
        where: { id: 'p1' },
        include: {
          user: true,
          licenses: true,
          providerServices: { include: { serviceCategory: true } },
        },
      });
    });

    it('should throw NotFoundException if provider not found', async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getProviderById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('verifyProvider', () => {
    const providerId = 'p1';
    const adminId = 'admin-1';

    it('should verify provider and update licenses', async () => {
      const provider = { id: providerId, userId: 'user-1' };
      const updated = { ...provider, isVerified: true, isActive: true };

      mockPrisma.providerProfile.findUnique.mockResolvedValue(provider);
      mockPrisma.providerLicense.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.providerProfile.update.mockResolvedValue(updated);
      mockPrisma.adminAction.create.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.verifyProvider(
        providerId,
        adminId,
        'Looks good',
      );

      expect(result).toEqual(updated);
      expect(mockPrisma.providerLicense.updateMany).toHaveBeenCalledWith({
        where: { providerId },
        data: { verifiedAt: expect.any(Date), status: 'APPROVED' },
      });
      expect(mockPrisma.providerProfile.update).toHaveBeenCalledWith({
        where: { id: providerId },
        data: { isVerified: true, isActive: true },
      });
      expect(mockPrisma.adminAction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          adminId,
          action: 'VERIFY_PROVIDER',
          targetId: providerId,
          targetType: 'ProviderProfile',
          notes: 'Looks good',
        }),
      });
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          title: 'Account Approved',
          type: 'PROVIDER_APPROVED',
        }),
      });
    });

    it('should throw NotFoundException if provider does not exist', async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyProvider('nonexistent', adminId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('rejectProvider', () => {
    const providerId = 'p1';
    const adminId = 'admin-1';

    it('should reject provider and update licenses with reason', async () => {
      const provider = { id: providerId, userId: 'user-1' };
      const updated = { ...provider, isVerified: false, isActive: false };

      mockPrisma.providerProfile.findUnique.mockResolvedValue(provider);
      mockPrisma.providerLicense.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.providerProfile.update.mockResolvedValue(updated);
      mockPrisma.adminAction.create.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.rejectProvider(
        providerId,
        adminId,
        'Incomplete documents',
      );

      expect(result).toEqual(updated);
      expect(mockPrisma.providerLicense.updateMany).toHaveBeenCalledWith({
        where: { providerId },
        data: { status: 'REJECTED', rejectionReason: 'Incomplete documents' },
      });
      expect(mockPrisma.providerProfile.update).toHaveBeenCalledWith({
        where: { id: providerId },
        data: { isVerified: false, isActive: false },
      });
      expect(mockPrisma.adminAction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          adminId,
          action: 'REJECT_PROVIDER',
          targetId: providerId,
          notes: 'Incomplete documents',
        }),
      });
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          title: 'Account Rejected',
          type: 'PROVIDER_REJECTED',
        }),
      });
    });

    it('should reject provider without reason', async () => {
      const provider = { id: providerId, userId: 'user-1' };
      const updated = { ...provider, isVerified: false, isActive: false };

      mockPrisma.providerProfile.findUnique.mockResolvedValue(provider);
      mockPrisma.providerLicense.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.providerProfile.update.mockResolvedValue(updated);
      mockPrisma.adminAction.create.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.rejectProvider(providerId, adminId);

      expect(result).toEqual(updated);
      expect(mockPrisma.providerLicense.updateMany).toHaveBeenCalledWith({
        where: { providerId },
        data: { status: 'REJECTED', rejectionReason: null },
      });
    });

    it('should throw NotFoundException if provider does not exist', async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.rejectProvider('nonexistent', adminId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivateProvider', () => {
    it('should deactivate a verified provider', async () => {
      const provider = { id: 'p1', userId: 'user-1', isVerified: true };
      const updated = { ...provider, isActive: false, isAvailable: false };

      mockPrisma.providerProfile.findUnique.mockResolvedValue(provider);
      mockPrisma.providerProfile.update.mockResolvedValue(updated);
      mockPrisma.adminAction.create.mockResolvedValue({});

      const result = await service.deactivateProvider(
        'p1',
        'admin-1',
        'Policy violation',
      );

      expect(result).toEqual(updated);
      expect(mockPrisma.providerProfile.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { isActive: false, isAvailable: false },
      });
      expect(mockPrisma.adminAction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'DEACTIVATE_PROVIDER',
          notes: 'Policy violation',
        }),
      });
    });

    it('should throw NotFoundException if provider does not exist', async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.deactivateProvider('nonexistent', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDashboardStats', () => {
    it('should return dashboard statistics with extended KPIs', async () => {
      mockPrisma.booking.count
        .mockResolvedValueOnce(50) // totalBookings
        .mockResolvedValueOnce(30) // completedBookings
        .mockResolvedValueOnce(5); // cancelledBookings
      mockPrisma.providerProfile.count
        .mockResolvedValueOnce(10) // activeProviders
        .mockResolvedValueOnce(3); // pendingVerification
      mockPrisma.patientProfile.count.mockResolvedValue(100);
      mockPrisma.payment.aggregate.mockResolvedValue({
        _sum: { amount: 25000 },
      });
      mockPrisma.booking.groupBy.mockResolvedValue([
        { status: 'REQUESTED', _count: 5 },
        { status: 'COMPLETED', _count: 30 },
        { status: 'CANCELLED', _count: 5 },
        { status: 'ACCEPTED', _count: 10 },
      ]);

      const result = await service.getDashboardStats();

      expect(result).toEqual({
        totalBookings: 50,
        activeProviders: 10,
        pendingVerification: 3,
        totalPatients: 100,
        completedBookings: 30,
        cancelledBookings: 5,
        totalEarnings: 25000,
        bookingsByStatus: {
          REQUESTED: 5,
          COMPLETED: 30,
          CANCELLED: 5,
          ACCEPTED: 10,
        },
      });
    });

    it('should handle zero earnings gracefully', async () => {
      mockPrisma.booking.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrisma.providerProfile.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrisma.patientProfile.count.mockResolvedValue(0);
      mockPrisma.payment.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });
      mockPrisma.booking.groupBy.mockResolvedValue([]);

      const result = await service.getDashboardStats();

      expect(result.totalEarnings).toBe(0);
      expect(result.bookingsByStatus).toEqual({});
    });
  });

  describe('getDashboardCharts', () => {
    it('should return bookings and earnings per day for last 30 days', async () => {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);

      mockPrisma.booking.findMany.mockResolvedValue([
        { createdAt: today, status: 'REQUESTED' },
        { createdAt: today, status: 'COMPLETED' },
      ]);
      mockPrisma.payment.findMany.mockResolvedValue([
        { paidAt: today, amount: 500 },
        { paidAt: today, amount: 300 },
      ]);

      const result = await service.getDashboardCharts();

      expect(result.bookingsPerDay).toBeDefined();
      expect(result.earningsPerDay).toBeDefined();
      expect(Object.keys(result.bookingsPerDay).length).toBe(30);
      expect(Object.keys(result.earningsPerDay).length).toBe(30);
      expect(result.bookingsPerDay[todayStr]).toBe(2);
      expect(result.earningsPerDay[todayStr]).toBe(800);
    });

    it('should return zeroes when no data exists', async () => {
      mockPrisma.booking.findMany.mockResolvedValue([]);
      mockPrisma.payment.findMany.mockResolvedValue([]);

      const result = await service.getDashboardCharts();

      expect(Object.keys(result.bookingsPerDay).length).toBe(30);
      const allBookingsZero = Object.values(result.bookingsPerDay).every(
        (v) => v === 0,
      );
      expect(allBookingsZero).toBe(true);

      const allEarningsZero = Object.values(result.earningsPerDay).every(
        (v) => v === 0,
      );
      expect(allEarningsZero).toBe(true);
    });
  });

  describe('getBookingById', () => {
    it('should return a booking with all relations', async () => {
      const booking = {
        id: 'b1',
        status: 'REQUESTED',
        patient: { name: 'Patient A' },
        provider: { name: 'Dr. A', user: { phone: '+1234567890' } },
        serviceCategory: { name: 'General' },
        address: null,
        statusHistory: [],
        consultationSummary: null,
        diagnosticRequests: [],
        referrals: [],
        payment: null,
      };
      mockPrisma.booking.findUnique.mockResolvedValue(booking);

      const result = await service.getBookingById('b1');

      expect(result).toEqual(booking);
      expect(mockPrisma.booking.findUnique).toHaveBeenCalledWith({
        where: { id: 'b1' },
        include: {
          patient: true,
          provider: { include: { user: true } },
          serviceCategory: true,
          address: true,
          statusHistory: { orderBy: { changedAt: 'asc' } },
          consultationSummary: { include: { prescriptions: true } },
          diagnosticRequests: { include: { labResults: true } },
          referrals: true,
          payment: true,
        },
      });
    });

    it('should throw NotFoundException if booking not found', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      await expect(service.getBookingById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getDiagnosticsOverview', () => {
    const mockDiagnostics = [
      {
        id: 'diag-1',
        testType: 'Blood Test',
        status: 'REQUESTED',
        booking: { patient: { name: 'John' }, provider: { name: 'Dr. A' } },
        labResults: [],
      },
    ];

    it('should return paginated diagnostics without status filter', async () => {
      mockPrisma.diagnosticRequest.findMany.mockResolvedValue(mockDiagnostics);
      mockPrisma.diagnosticRequest.count.mockResolvedValue(1);

      const result = await service.getDiagnosticsOverview();

      expect(result).toEqual({
        data: mockDiagnostics,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(mockPrisma.diagnosticRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should filter by status when provided', async () => {
      mockPrisma.diagnosticRequest.findMany.mockResolvedValue(mockDiagnostics);
      mockPrisma.diagnosticRequest.count.mockResolvedValue(1);

      const result = await service.getDiagnosticsOverview(1, 20, 'REQUESTED');

      expect(result).toEqual({
        data: mockDiagnostics,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(mockPrisma.diagnosticRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'REQUESTED' },
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      mockPrisma.diagnosticRequest.findMany.mockResolvedValue([]);
      mockPrisma.diagnosticRequest.count.mockResolvedValue(25);

      const result = await service.getDiagnosticsOverview(2, 10);

      expect(result).toEqual({
        data: [],
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      });
      expect(mockPrisma.diagnosticRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });
  });

  describe('getVerificationQueue', () => {
    it('should delegate to verificationService', async () => {
      const queue = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      mockVerificationService.getVerificationQueue.mockResolvedValue(queue);

      const result = await service.getVerificationQueue(1, 20);

      expect(result).toEqual(queue);
      expect(mockVerificationService.getVerificationQueue).toHaveBeenCalledWith(
        1,
        20,
      );
    });
  });

  describe('retryNmcVerification', () => {
    it('should delegate to verificationService', async () => {
      const retryResult = { status: 'SUCCESS', license: { id: 'license-1' } };
      mockVerificationService.retryVerification.mockResolvedValue(retryResult);

      const result = await service.retryNmcVerification('license-1', 'admin-1');

      expect(result).toEqual(retryResult);
      expect(mockVerificationService.retryVerification).toHaveBeenCalledWith(
        'license-1',
        'admin-1',
      );
    });
  });
});

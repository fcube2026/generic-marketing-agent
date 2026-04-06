import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController', () => {
  let controller: AdminController;
  let service: AdminService;

  const mockProvider = {
    id: 'p1',
    name: 'Dr. Smith',
    isVerified: false,
    isActive: true,
    user: { phone: '+919876543210' },
    licenses: [],
    providerServices: [],
  };

  const mockAdminUser = { id: 'admin-1', role: 'ADMIN' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: {
            getDashboardStats: jest.fn().mockResolvedValue({
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
            }),
            getDashboardCharts: jest.fn().mockResolvedValue({
              bookingsPerDay: { '2025-01-01': 2, '2025-01-02': 3 },
              earningsPerDay: { '2025-01-01': 500, '2025-01-02': 700 },
            }),
            getAllProviders: jest.fn().mockResolvedValue([mockProvider]),
            getPendingProviders: jest.fn().mockResolvedValue([mockProvider]),
            getProviderById: jest.fn().mockResolvedValue(mockProvider),
            verifyProvider: jest.fn().mockResolvedValue({
              ...mockProvider,
              isVerified: true,
            }),
            rejectProvider: jest.fn().mockResolvedValue({
              ...mockProvider,
              isActive: false,
            }),
            deactivateProvider: jest.fn().mockResolvedValue({
              ...mockProvider,
              isActive: false,
              isAvailable: false,
            }),
            getAllBookings: jest.fn().mockResolvedValue({
              data: [],
              total: 0,
              page: 1,
              limit: 20,
              totalPages: 0,
            }),
            getBookingById: jest.fn().mockResolvedValue({
              id: 'b1',
              status: 'REQUESTED',
              patient: { name: 'Patient A' },
              provider: { name: 'Dr. A' },
            }),
            getDiagnosticsOverview: jest.fn().mockResolvedValue({
              data: [],
              total: 0,
              page: 1,
              limit: 20,
              totalPages: 0,
            }),
            getReferralsOverview: jest.fn().mockResolvedValue([]),
            getAllPayouts: jest.fn().mockResolvedValue({
              data: [],
              total: 0,
              page: 1,
              limit: 20,
              totalPages: 0,
            }),
            getPayoutsSummary: jest.fn().mockResolvedValue({
              totalPayouts: 0,
              pendingCount: 0,
              processedCount: 0,
              totalAmount: 0,
              pendingAmount: 0,
              processedAmount: 0,
            }),
            processPayoutRecord: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDashboardStats', () => {
    it('should return dashboard stats with extended KPIs', async () => {
      const result = await controller.getDashboardStats();

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
      expect(service.getDashboardStats).toHaveBeenCalled();
    });
  });

  describe('getDashboardCharts', () => {
    it('should return chart data', async () => {
      const result = await controller.getDashboardCharts();

      expect(result).toEqual({
        bookingsPerDay: { '2025-01-01': 2, '2025-01-02': 3 },
        earningsPerDay: { '2025-01-01': 500, '2025-01-02': 700 },
      });
      expect(service.getDashboardCharts).toHaveBeenCalled();
    });
  });

  describe('getAllProviders', () => {
    it('should return providers with status filter', async () => {
      const result = await controller.getAllProviders('pending');

      expect(result).toEqual([mockProvider]);
      expect(service.getAllProviders).toHaveBeenCalledWith('pending');
    });

    it('should return all providers without filter', async () => {
      await controller.getAllProviders();

      expect(service.getAllProviders).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getPendingProviders', () => {
    it('should return pending providers', async () => {
      const result = await controller.getPendingProviders();

      expect(result).toEqual([mockProvider]);
      expect(service.getPendingProviders).toHaveBeenCalled();
    });
  });

  describe('getProviderById', () => {
    it('should return provider details', async () => {
      const result = await controller.getProviderById('p1');

      expect(result).toEqual(mockProvider);
      expect(service.getProviderById).toHaveBeenCalledWith('p1');
    });
  });

  describe('verifyProvider', () => {
    it('should verify provider with notes', async () => {
      const result = await controller.verifyProvider(
        'p1',
        mockAdminUser,
        'Approved via verification queue',
      );

      expect(result.isVerified).toBe(true);
      expect(service.verifyProvider).toHaveBeenCalledWith(
        'p1',
        'admin-1',
        'Approved via verification queue',
      );
    });

    it('should verify provider without notes', async () => {
      await controller.verifyProvider('p1', mockAdminUser);

      expect(service.verifyProvider).toHaveBeenCalledWith(
        'p1',
        'admin-1',
        undefined,
      );
    });
  });

  describe('rejectProvider', () => {
    it('should reject provider with reason', async () => {
      const result = await controller.rejectProvider(
        'p1',
        mockAdminUser,
        'Incomplete documents',
      );

      expect(result.isActive).toBe(false);
      expect(service.rejectProvider).toHaveBeenCalledWith(
        'p1',
        'admin-1',
        'Incomplete documents',
      );
    });

    it('should reject provider without reason', async () => {
      await controller.rejectProvider('p1', mockAdminUser);

      expect(service.rejectProvider).toHaveBeenCalledWith(
        'p1',
        'admin-1',
        undefined,
      );
    });
  });

  describe('deactivateProvider', () => {
    it('should deactivate provider with notes', async () => {
      const result = await controller.deactivateProvider(
        'p1',
        mockAdminUser,
        'Policy violation',
      );

      expect(result.isActive).toBe(false);
      expect(service.deactivateProvider).toHaveBeenCalledWith(
        'p1',
        'admin-1',
        'Policy violation',
      );
    });
  });

  describe('getBookingById', () => {
    it('should return booking details', async () => {
      const result = await controller.getBookingById('b1');

      expect(result).toEqual({
        id: 'b1',
        status: 'REQUESTED',
        patient: { name: 'Patient A' },
        provider: { name: 'Dr. A' },
      });
      expect(service.getBookingById).toHaveBeenCalledWith('b1');
    });
  });

  describe('getDiagnosticsOverview', () => {
    it('should call service with default pagination and no status filter', async () => {
      const result = await controller.getDiagnosticsOverview();

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
      expect(service.getDiagnosticsOverview).toHaveBeenCalledWith(
        1,
        20,
        undefined,
      );
    });

    it('should pass status filter and custom pagination', async () => {
      await controller.getDiagnosticsOverview('2', '10', 'REQUESTED');

      expect(service.getDiagnosticsOverview).toHaveBeenCalledWith(
        2,
        10,
        'REQUESTED',
      );
    });
  });
});

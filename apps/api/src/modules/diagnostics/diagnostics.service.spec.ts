import { Test, TestingModule } from '@nestjs/testing';
import { DiagnosticsService } from './diagnostics.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('DiagnosticsService', () => {
  let service: DiagnosticsService;
  let prisma: PrismaService;

  const mockBooking = {
    id: 'booking-1',
    status: 'COMPLETED',
    providerId: 'provider-1',
    patientId: 'patient-1',
    provider: { id: 'provider-1', userId: 'user-provider-1' },
  };

  const mockDiagnosticRequest = {
    id: 'diag-1',
    bookingId: 'booking-1',
    testType: 'Blood Test',
    notes: 'Fasting required',
    status: 'REQUESTED',
    scheduledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLabResult = {
    id: 'result-1',
    diagnosticRequestId: 'diag-1',
    resultFileUrl: 'https://storage.example.com/result.pdf',
    notes: 'Normal values',
    uploadedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiagnosticsService,
        {
          provide: PrismaService,
          useValue: {
            booking: {
              findUnique: jest.fn(),
            },
            diagnosticRequest: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
            labResult: {
              create: jest.fn(),
            },
            notification: {
              create: jest.fn(),
            },
            patientProfile: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DiagnosticsService>(DiagnosticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRequest', () => {
    const dto = {
      bookingId: 'booking-1',
      testType: 'Blood Test',
      notes: 'Fasting required',
    };

    it('should create a diagnostic request when provider is assigned', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
      (prisma.diagnosticRequest.create as jest.Mock).mockResolvedValue(
        mockDiagnosticRequest,
      );

      const result = await service.createRequest(dto, 'user-provider-1');

      expect(result).toEqual(mockDiagnosticRequest);
      expect(prisma.diagnosticRequest.create).toHaveBeenCalledWith({
        data: {
          bookingId: 'booking-1',
          testType: 'Blood Test',
          notes: 'Fasting required',
          scheduledAt: undefined,
          status: 'REQUESTED',
        },
      });
    });

    it('should throw NotFoundException when booking does not exist', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createRequest(dto, 'user-provider-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the assigned provider', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);

      await expect(service.createRequest(dto, 'user-other')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should pass scheduledAt when provided', async () => {
      const dtoWithSchedule = { ...dto, scheduledAt: '2026-05-01T10:00:00Z' };
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
      (prisma.diagnosticRequest.create as jest.Mock).mockResolvedValue(
        mockDiagnosticRequest,
      );

      await service.createRequest(dtoWithSchedule, 'user-provider-1');

      expect(prisma.diagnosticRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          scheduledAt: new Date('2026-05-01T10:00:00Z'),
        }),
      });
    });
  });

  describe('updateStatus', () => {
    it('should update diagnostic request status', async () => {
      const updatedRequest = { ...mockDiagnosticRequest, status: 'SCHEDULED' };
      (prisma.diagnosticRequest.findUnique as jest.Mock).mockResolvedValue(
        mockDiagnosticRequest,
      );
      (prisma.diagnosticRequest.update as jest.Mock).mockResolvedValue(
        updatedRequest,
      );

      const result = await service.updateStatus('diag-1', {
        status: 'SCHEDULED',
      });

      expect(result).toEqual(updatedRequest);
      expect(prisma.diagnosticRequest.update).toHaveBeenCalledWith({
        where: { id: 'diag-1' },
        data: { status: 'SCHEDULED' },
      });
    });

    it('should throw NotFoundException when request does not exist', async () => {
      (prisma.diagnosticRequest.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.updateStatus('nonexistent', { status: 'SCHEDULED' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update scheduledAt when provided', async () => {
      (prisma.diagnosticRequest.findUnique as jest.Mock).mockResolvedValue(
        mockDiagnosticRequest,
      );
      (prisma.diagnosticRequest.update as jest.Mock).mockResolvedValue({
        ...mockDiagnosticRequest,
        status: 'SCHEDULED',
      });

      await service.updateStatus('diag-1', {
        status: 'SCHEDULED',
        scheduledAt: '2026-05-01T10:00:00Z',
      });

      expect(prisma.diagnosticRequest.update).toHaveBeenCalledWith({
        where: { id: 'diag-1' },
        data: {
          status: 'SCHEDULED',
          scheduledAt: new Date('2026-05-01T10:00:00Z'),
        },
      });
    });
  });

  describe('uploadResult', () => {
    const mockRequestWithBooking = {
      ...mockDiagnosticRequest,
      booking: {
        id: 'booking-1',
        patient: { id: 'patient-1', userId: 'user-patient-1', name: 'John' },
      },
    };

    it('should create lab result, update status to RESULTED, and notify patient', async () => {
      (prisma.diagnosticRequest.findUnique as jest.Mock).mockResolvedValue(
        mockRequestWithBooking,
      );
      (prisma.labResult.create as jest.Mock).mockResolvedValue(mockLabResult);
      (prisma.diagnosticRequest.update as jest.Mock).mockResolvedValue({
        ...mockDiagnosticRequest,
        status: 'RESULTED',
      });
      (prisma.notification.create as jest.Mock).mockResolvedValue({});

      const result = await service.uploadResult('diag-1', {
        resultFileUrl: 'https://storage.example.com/result.pdf',
        notes: 'Normal values',
      });

      expect(result).toEqual(mockLabResult);
      expect(prisma.labResult.create).toHaveBeenCalledWith({
        data: {
          diagnosticRequestId: 'diag-1',
          resultFileUrl: 'https://storage.example.com/result.pdf',
          notes: 'Normal values',
        },
      });
      expect(prisma.diagnosticRequest.update).toHaveBeenCalledWith({
        where: { id: 'diag-1' },
        data: { status: 'RESULTED' },
      });
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-patient-1',
          title: 'Lab Result Ready',
          message:
            'Your lab result for "Blood Test" is now available. Please check your diagnostics section.',
          type: 'LAB_RESULT_READY',
          metadata: {
            diagnosticRequestId: 'diag-1',
            testType: 'Blood Test',
            bookingId: 'booking-1',
          },
        },
      });
    });

    it('should throw NotFoundException when request does not exist', async () => {
      (prisma.diagnosticRequest.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.uploadResult('nonexistent', {
          resultFileUrl: 'https://example.com/result.pdf',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPatientDiagnostics', () => {
    const mockPatientProfile = { id: 'patient-1', userId: 'user-patient-1' };
    const mockDiagnostics = [
      {
        ...mockDiagnosticRequest,
        labResults: [],
        booking: {
          id: 'booking-1',
          provider: { id: 'provider-1', name: 'Dr. Smith' },
          serviceCategory: { id: 'cat-1', name: 'General' },
        },
      },
    ];

    it('should return paginated diagnostics for a patient', async () => {
      (prisma.patientProfile.findUnique as jest.Mock).mockResolvedValue(
        mockPatientProfile,
      );
      (prisma.diagnosticRequest.findMany as jest.Mock).mockResolvedValue(
        mockDiagnostics,
      );
      (prisma.diagnosticRequest.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getPatientDiagnostics(
        'user-patient-1',
        1,
        10,
      );

      expect(result).toEqual({
        data: mockDiagnostics,
        total: 1,
        page: 1,
        limit: 10,
      });
      expect(prisma.diagnosticRequest.findMany).toHaveBeenCalledWith({
        where: { booking: { patientId: 'patient-1' } },
        include: {
          labResults: true,
          booking: {
            include: {
              provider: true,
              serviceCategory: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('should return empty result when patient profile does not exist', async () => {
      (prisma.patientProfile.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getPatientDiagnostics('user-unknown', 1, 10);

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 10 });
    });

    it('should handle pagination correctly', async () => {
      (prisma.patientProfile.findUnique as jest.Mock).mockResolvedValue(
        mockPatientProfile,
      );
      (prisma.diagnosticRequest.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.diagnosticRequest.count as jest.Mock).mockResolvedValue(15);

      const result = await service.getPatientDiagnostics(
        'user-patient-1',
        2,
        10,
      );

      expect(result).toEqual({ data: [], total: 15, page: 2, limit: 10 });
      expect(prisma.diagnosticRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });
});

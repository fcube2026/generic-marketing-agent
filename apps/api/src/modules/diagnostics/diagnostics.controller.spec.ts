import { Test, TestingModule } from '@nestjs/testing';
import { DiagnosticsController } from './diagnostics.controller';
import { DiagnosticsService } from './diagnostics.service';

describe('DiagnosticsController', () => {
  let controller: DiagnosticsController;
  let service: DiagnosticsService;

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
      controllers: [DiagnosticsController],
      providers: [
        {
          provide: DiagnosticsService,
          useValue: {
            createRequest: jest.fn().mockResolvedValue(mockDiagnosticRequest),
            updateStatus: jest.fn().mockResolvedValue({
              ...mockDiagnosticRequest,
              status: 'SCHEDULED',
            }),
            uploadResult: jest.fn().mockResolvedValue(mockLabResult),
            getPatientDiagnostics: jest.fn().mockResolvedValue({
              data: [mockDiagnosticRequest],
              total: 1,
              page: 1,
              limit: 10,
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<DiagnosticsController>(DiagnosticsController);
    service = module.get<DiagnosticsService>(DiagnosticsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createRequest', () => {
    it('should call service.createRequest with dto and user id', async () => {
      const dto = {
        bookingId: 'booking-1',
        testType: 'Blood Test',
        notes: 'Fasting required',
      };
      const user = { id: 'user-1' };

      const result = await controller.createRequest(dto, user);

      expect(result).toEqual(mockDiagnosticRequest);
      expect(service.createRequest).toHaveBeenCalledWith(dto, 'user-1');
    });
  });

  describe('updateStatus', () => {
    it('should call service.updateStatus with id and dto', async () => {
      const dto = { status: 'SCHEDULED' };

      const result = await controller.updateStatus('diag-1', dto);

      expect(result).toEqual({
        ...mockDiagnosticRequest,
        status: 'SCHEDULED',
      });
      expect(service.updateStatus).toHaveBeenCalledWith('diag-1', dto);
    });
  });

  describe('uploadResult', () => {
    it('should call service.uploadResult with id and dto', async () => {
      const dto = {
        resultFileUrl: 'https://storage.example.com/result.pdf',
        notes: 'Normal values',
      };

      const result = await controller.uploadResult('diag-1', dto);

      expect(result).toEqual(mockLabResult);
      expect(service.uploadResult).toHaveBeenCalledWith('diag-1', dto);
    });
  });

  describe('getPatientDiagnostics', () => {
    it('should call service.getPatientDiagnostics with default pagination', async () => {
      const user = { id: 'user-1' };

      const result = await controller.getPatientDiagnostics(user);

      expect(result).toEqual({
        data: [mockDiagnosticRequest],
        total: 1,
        page: 1,
        limit: 10,
      });
      expect(service.getPatientDiagnostics).toHaveBeenCalledWith(
        'user-1',
        1,
        10,
      );
    });

    it('should call service.getPatientDiagnostics with custom pagination', async () => {
      const user = { id: 'user-1' };

      await controller.getPatientDiagnostics(user, '2', '5');

      expect(service.getPatientDiagnostics).toHaveBeenCalledWith(
        'user-1',
        2,
        5,
      );
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ConsultationController } from './consultation.controller';
import { ConsultationService } from './consultation.service';

describe('ConsultationController', () => {
  let controller: ConsultationController;
  let service: ConsultationService;

  const mockSummary = {
    id: 'summary-1',
    bookingId: 'booking-1',
    symptoms: 'Fever and cough',
    observations: 'Temperature 101F',
    diagnosis: 'Viral infection',
    medicinesAdvised: null,
    nextSteps: 'Rest and fluids',
    followUpRecommendation: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConsultationController],
      providers: [
        {
          provide: ConsultationService,
          useValue: {
            createSummary: jest.fn().mockResolvedValue(mockSummary),
            getSummary: jest
              .fn()
              .mockResolvedValue({ ...mockSummary, prescriptions: [] }),
            getPatientSummaries: jest.fn().mockResolvedValue({
              data: [{ ...mockSummary, prescriptions: [], booking: {} }],
              total: 1,
              page: 1,
              limit: 10,
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<ConsultationController>(ConsultationController);
    service = module.get<ConsultationService>(ConsultationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createSummary', () => {
    it('should call service.createSummary with correct params', async () => {
      const dto = {
        symptoms: 'Fever and cough',
        diagnosis: 'Viral infection',
      };
      const user = { id: 'user-1' };

      const result = await controller.createSummary('booking-1', user, dto);

      expect(result).toEqual(mockSummary);
      expect(service.createSummary).toHaveBeenCalledWith(
        'booking-1',
        'user-1',
        dto,
      );
    });
  });

  describe('getSummary', () => {
    it('should call service.getSummary with booking id', async () => {
      const result = await controller.getSummary('booking-1');

      expect(result).toEqual({ ...mockSummary, prescriptions: [] });
      expect(service.getSummary).toHaveBeenCalledWith('booking-1');
    });
  });

  describe('getPatientSummaries', () => {
    it('should call service.getPatientSummaries with default pagination', async () => {
      const user = { id: 'user-1' };

      const result = await controller.getPatientSummaries(user);

      expect(result).toEqual({
        data: [{ ...mockSummary, prescriptions: [], booking: {} }],
        total: 1,
        page: 1,
        limit: 10,
      });
      expect(service.getPatientSummaries).toHaveBeenCalledWith('user-1', 1, 10);
    });

    it('should call service.getPatientSummaries with custom pagination', async () => {
      const user = { id: 'user-1' };

      await controller.getPatientSummaries(user, '2', '5');

      expect(service.getPatientSummaries).toHaveBeenCalledWith('user-1', 2, 5);
    });
  });
});

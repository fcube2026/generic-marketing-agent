import { Test, TestingModule } from '@nestjs/testing';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';

describe('ReferralsController', () => {
  let controller: ReferralsController;
  let service: ReferralsService;

  const mockReferral = {
    id: 'referral-1',
    bookingId: 'booking-1',
    specialistType: 'Cardiologist',
    notes: 'Patient has irregular heartbeat',
    status: 'RECOMMENDED',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferralsController],
      providers: [
        {
          provide: ReferralsService,
          useValue: {
            createReferral: jest.fn().mockResolvedValue(mockReferral),
            updateStatus: jest.fn().mockResolvedValue({
              ...mockReferral,
              status: 'BOOKED',
            }),
            getPatientReferrals: jest.fn().mockResolvedValue({
              data: [mockReferral],
              total: 1,
              page: 1,
              limit: 10,
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<ReferralsController>(ReferralsController);
    service = module.get<ReferralsService>(ReferralsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createReferral', () => {
    it('should call service.createReferral with dto and user id', async () => {
      const dto = {
        bookingId: 'booking-1',
        specialistType: 'Cardiologist',
        notes: 'Patient has irregular heartbeat',
      };
      const user = { id: 'user-1' };

      const result = await controller.createReferral(dto, user);

      expect(result).toEqual(mockReferral);
      expect(service.createReferral).toHaveBeenCalledWith(dto, 'user-1');
    });
  });

  describe('updateStatus', () => {
    it('should call service.updateStatus with id, dto, and user id', async () => {
      const dto = { status: 'BOOKED' };
      const user = { id: 'user-1' };

      const result = await controller.updateStatus('referral-1', dto, user);

      expect(result).toEqual({
        ...mockReferral,
        status: 'BOOKED',
      });
      expect(service.updateStatus).toHaveBeenCalledWith(
        'referral-1',
        dto,
        'user-1',
      );
    });
  });

  describe('getPatientReferrals', () => {
    it('should call service.getPatientReferrals with default pagination', async () => {
      const user = { id: 'user-1' };

      const result = await controller.getPatientReferrals(user);

      expect(result).toEqual({
        data: [mockReferral],
        total: 1,
        page: 1,
        limit: 10,
      });
      expect(service.getPatientReferrals).toHaveBeenCalledWith('user-1', 1, 10);
    });

    it('should call service.getPatientReferrals with custom pagination', async () => {
      const user = { id: 'user-1' };

      await controller.getPatientReferrals(user, '2', '5');

      expect(service.getPatientReferrals).toHaveBeenCalledWith('user-1', 2, 5);
    });
  });
});

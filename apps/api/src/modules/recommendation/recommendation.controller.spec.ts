import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';

describe('RecommendationController', () => {
  let controller: RecommendationController;
  let service: RecommendationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationController],
      providers: [
        {
          provide: RecommendationService,
          useValue: {
            getRecommendation: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RecommendationController>(RecommendationController);
    service = module.get<RecommendationService>(RecommendationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getRecommendation', () => {
    it('should call service.getRecommendation with dto and return result', async () => {
      const dto = {
        lat: 12.97,
        lng: 77.59,
        serviceCategory: 'general',
        urgency: 'MEDIUM' as const,
      };

      const mockResult = {
        homeVisit: null,
        doctorPlace: null,
        recommended: null,
        reason: 'No providers available in your area at this time.',
      };

      (service.getRecommendation as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.getRecommendation(dto);

      expect(service.getRecommendation).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResult);
    });
  });
});

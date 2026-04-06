import { Test, TestingModule } from '@nestjs/testing';
import {
  RecommendationService,
  calculateScore,
  haversineDistance,
  SCORING_WEIGHTS,
  URGENCY_SCORES,
  ETA_MULTIPLIERS,
} from './recommendation.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('RecommendationService', () => {
  let service: RecommendationService;
  let prisma: PrismaService;

  const baseProvider = {
    id: 'provider-1',
    userId: 'user-1',
    name: 'Dr. Smith',
    bio: '',
    specialization: 'General',
    contactInfo: '1234567890',
    licenseNumber: 'LIC001',
    isVerified: true,
    isActive: true,
    isAvailable: true,
    homeVisitEnabled: true,
    doctorPlaceVisitEnabled: true,
    serviceRadius: 20,
    consultationFeeHomeVisit: 500,
    consultationFeeDoctorPlace: 400,
    currentLat: 12.97,
    currentLng: 77.59,
    createdAt: new Date(),
    updatedAt: new Date(),
    providerServices: [
      {
        id: 'ps-1',
        providerId: 'provider-1',
        serviceCategoryId: 'cat-1',
        serviceCategory: { id: 'cat-1', slug: 'general', name: 'General' },
      },
    ],
    user: { id: 'user-1', phone: '1234567890', role: 'PROVIDER' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        {
          provide: PrismaService,
          useValue: {
            providerProfile: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<RecommendationService>(RecommendationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── Unit tests for exported helper functions ───

  describe('haversineDistance', () => {
    it('should return 0 for identical coordinates', () => {
      expect(haversineDistance(12.97, 77.59, 12.97, 77.59)).toBe(0);
    });

    it('should compute correct distance between two known points', () => {
      // Bangalore to Chennai ≈ 290 km
      const dist = haversineDistance(12.97, 77.59, 13.08, 80.27);
      expect(dist).toBeGreaterThan(280);
      expect(dist).toBeLessThan(310);
    });
  });

  describe('calculateScore', () => {
    it('should return max score for best-case inputs', () => {
      // available, distance=0, fee=0, urgency=HIGH
      const score = calculateScore(true, 0, 0, 'HIGH', 10, 1000);
      const expected =
        100 * SCORING_WEIGHTS.availability +
        100 * SCORING_WEIGHTS.distance +
        100 * SCORING_WEIGHTS.fee +
        URGENCY_SCORES.HIGH * SCORING_WEIGHTS.urgency;
      expect(score).toBeCloseTo(expected);
    });

    it('should return 0 availability contribution when unavailable', () => {
      const score = calculateScore(false, 0, 0, 'HIGH', 10, 1000);
      const expected =
        0 * SCORING_WEIGHTS.availability +
        100 * SCORING_WEIGHTS.distance +
        100 * SCORING_WEIGHTS.fee +
        URGENCY_SCORES.HIGH * SCORING_WEIGHTS.urgency;
      expect(score).toBeCloseTo(expected);
    });

    it('should give lower score for higher distance', () => {
      const close = calculateScore(true, 2, 500, 'MEDIUM', 10, 1000);
      const far = calculateScore(true, 8, 500, 'MEDIUM', 10, 1000);
      expect(close).toBeGreaterThan(far);
    });

    it('should give lower score for higher fee', () => {
      const cheap = calculateScore(true, 5, 200, 'MEDIUM', 10, 1000);
      const expensive = calculateScore(true, 5, 800, 'MEDIUM', 10, 1000);
      expect(cheap).toBeGreaterThan(expensive);
    });

    it('should give higher score for HIGH urgency vs LOW urgency', () => {
      const high = calculateScore(true, 5, 500, 'HIGH', 10, 1000);
      const low = calculateScore(true, 5, 500, 'LOW', 10, 1000);
      expect(high).toBeGreaterThan(low);
    });

    it('should use default urgency score for unknown urgency', () => {
      const score = calculateScore(true, 5, 500, 'UNKNOWN', 10, 1000);
      const expected =
        100 * SCORING_WEIGHTS.availability +
        Math.max(0, 100 - (5 / 10) * 100) * SCORING_WEIGHTS.distance +
        Math.max(0, 100 - (500 / 1000) * 100) * SCORING_WEIGHTS.fee +
        30 * SCORING_WEIGHTS.urgency;
      expect(score).toBeCloseTo(expected);
    });
  });

  describe('SCORING_WEIGHTS', () => {
    it('should sum to 1.0', () => {
      const total =
        SCORING_WEIGHTS.availability +
        SCORING_WEIGHTS.distance +
        SCORING_WEIGHTS.fee +
        SCORING_WEIGHTS.urgency;
      expect(total).toBeCloseTo(1.0);
    });
  });

  // ─── Integration-style tests for getRecommendation ───

  describe('getRecommendation', () => {
    const dto = {
      lat: 12.97,
      lng: 77.59,
      serviceCategory: 'general',
      urgency: 'MEDIUM' as const,
    };

    it('should return null recommendation when no providers found', async () => {
      (prisma.providerProfile.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRecommendation(dto);

      expect(result.homeVisit).toBeNull();
      expect(result.doctorPlace).toBeNull();
      expect(result.recommended).toBeNull();
      expect(result.reason).toBe(
        'No providers available in your area at this time.',
      );
    });

    it('should recommend DOCTOR_PLACE when only doctor-place providers exist', async () => {
      const doctorOnly = {
        ...baseProvider,
        homeVisitEnabled: false,
        doctorPlaceVisitEnabled: true,
      };
      (prisma.providerProfile.findMany as jest.Mock).mockResolvedValue([
        doctorOnly,
      ]);

      const result = await service.getRecommendation(dto);

      expect(result.recommended).toBe('DOCTOR_PLACE');
      expect(result.homeVisit).toBeNull();
      expect(result.doctorPlace).not.toBeNull();
      expect(result.reason).toContain('No home visit providers');
    });

    it('should recommend HOME_VISIT when only home-visit providers exist', async () => {
      const homeOnly = {
        ...baseProvider,
        homeVisitEnabled: true,
        doctorPlaceVisitEnabled: false,
      };
      (prisma.providerProfile.findMany as jest.Mock).mockResolvedValue([
        homeOnly,
      ]);

      const result = await service.getRecommendation(dto);

      expect(result.recommended).toBe('HOME_VISIT');
      expect(result.doctorPlace).toBeNull();
      expect(result.homeVisit).not.toBeNull();
      expect(result.reason).toContain('home conveniently');
    });

    it('should recommend HOME_VISIT when home fee is lower for non-urgent', async () => {
      const provider = {
        ...baseProvider,
        consultationFeeHomeVisit: 300,
        consultationFeeDoctorPlace: 500,
      };
      (prisma.providerProfile.findMany as jest.Mock).mockResolvedValue([
        provider,
      ]);

      const result = await service.getRecommendation({
        ...dto,
        urgency: 'LOW',
      });

      expect(result.recommended).toBe('HOME_VISIT');
      expect(result.reason).toContain('cost-effective');
    });

    it('should recommend DOCTOR_PLACE when doctor-place fee is lower for non-urgent', async () => {
      const provider = {
        ...baseProvider,
        consultationFeeHomeVisit: 600,
        consultationFeeDoctorPlace: 300,
      };
      (prisma.providerProfile.findMany as jest.Mock).mockResolvedValue([
        provider,
      ]);

      const result = await service.getRecommendation({
        ...dto,
        urgency: 'LOW',
      });

      expect(result.recommended).toBe('DOCTOR_PLACE');
      expect(result.reason).toContain('lower cost');
    });

    it('should use score-based logic for HIGH urgency', async () => {
      (prisma.providerProfile.findMany as jest.Mock).mockResolvedValue([
        baseProvider,
      ]);

      const result = await service.getRecommendation({
        ...dto,
        urgency: 'HIGH',
      });

      expect(['HOME_VISIT', 'DOCTOR_PLACE']).toContain(result.recommended);
      expect(result.reason.length).toBeGreaterThan(0);
    });

    it('should return score, eta, fee, and distance for each option', async () => {
      (prisma.providerProfile.findMany as jest.Mock).mockResolvedValue([
        baseProvider,
      ]);

      const result = await service.getRecommendation(dto);

      if (result.homeVisit) {
        expect(result.homeVisit).toHaveProperty('score');
        expect(result.homeVisit).toHaveProperty('eta');
        expect(result.homeVisit).toHaveProperty('fee');
        expect(result.homeVisit).toHaveProperty('distance');
        expect(result.homeVisit).toHaveProperty('provider');
      }
      if (result.doctorPlace) {
        expect(result.doctorPlace).toHaveProperty('score');
        expect(result.doctorPlace).toHaveProperty('eta');
        expect(result.doctorPlace).toHaveProperty('fee');
        expect(result.doctorPlace).toHaveProperty('distance');
        expect(result.doctorPlace).toHaveProperty('provider');
      }
    });

    it('should always return a reason string', async () => {
      (prisma.providerProfile.findMany as jest.Mock).mockResolvedValue([
        baseProvider,
      ]);

      const result = await service.getRecommendation(dto);

      expect(typeof result.reason).toBe('string');
      expect(result.reason.length).toBeGreaterThan(0);
    });

    it('should filter out providers beyond their service radius', async () => {
      const farProvider = {
        ...baseProvider,
        currentLat: 28.61, // Delhi – very far from Bangalore
        currentLng: 77.21,
        serviceRadius: 5, // only 5 km
      };
      (prisma.providerProfile.findMany as jest.Mock).mockResolvedValue([
        farProvider,
      ]);

      const result = await service.getRecommendation(dto);

      expect(result.homeVisit).toBeNull();
      expect(result.doctorPlace).toBeNull();
      expect(result.recommended).toBeNull();
    });

    it('should pick the best-scoring provider among multiple candidates', async () => {
      const nearProvider = {
        ...baseProvider,
        id: 'provider-near',
        consultationFeeHomeVisit: 300,
        consultationFeeDoctorPlace: 250,
      };
      const farProvider = {
        ...baseProvider,
        id: 'provider-far',
        currentLat: 12.98, // slightly farther
        currentLng: 77.61,
        consultationFeeHomeVisit: 800,
        consultationFeeDoctorPlace: 700,
      };
      (prisma.providerProfile.findMany as jest.Mock).mockResolvedValue([
        nearProvider,
        farProvider,
      ]);

      const result = await service.getRecommendation(dto);

      // The near provider with lower fee should score higher
      expect(result.homeVisit?.provider.id).toBe('provider-near');
    });

    it('should compute ETA using configured multipliers', async () => {
      (prisma.providerProfile.findMany as jest.Mock).mockResolvedValue([
        baseProvider,
      ]);

      const result = await service.getRecommendation(dto);

      if (result.homeVisit) {
        expect(result.homeVisit.eta).toBe(
          Math.round(result.homeVisit.distance * ETA_MULTIPLIERS.homeVisit),
        );
      }
      if (result.doctorPlace) {
        expect(result.doctorPlace.eta).toBe(
          Math.round(result.doctorPlace.distance * ETA_MULTIPLIERS.doctorPlace),
        );
      }
    });
  });
});

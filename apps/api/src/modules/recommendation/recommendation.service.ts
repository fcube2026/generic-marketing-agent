import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GetRecommendationDto } from './dto/get-recommendation.dto';

/** Tweakable scoring weights – adjust these to change recommendation priority */
export const SCORING_WEIGHTS = {
  availability: 0.4,
  distance: 0.3,
  fee: 0.2,
  urgency: 0.1,
};

/** Urgency level scores mapped to each urgency tier */
export const URGENCY_SCORES: Record<string, number> = {
  HIGH: 100,
  MEDIUM: 60,
  LOW: 30,
};

/** ETA multiplier (minutes per km) for each mode */
export const ETA_MULTIPLIERS = {
  homeVisit: 3,
  doctorPlace: 2,
};

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calculateScore(
  isAvailable: boolean,
  distance: number,
  fee: number,
  urgency: string,
  maxDistance: number,
  maxFee: number,
): number {
  const availabilityScore = isAvailable ? 100 : 0;
  const distanceScore = Math.max(0, 100 - (distance / maxDistance) * 100);
  const feeScore = Math.max(0, 100 - (fee / maxFee) * 100);
  const urgencyScore = URGENCY_SCORES[urgency] ?? 30;

  return (
    availabilityScore * SCORING_WEIGHTS.availability +
    distanceScore * SCORING_WEIGHTS.distance +
    feeScore * SCORING_WEIGHTS.fee +
    urgencyScore * SCORING_WEIGHTS.urgency
  );
}

@Injectable()
export class RecommendationService {
  constructor(private prisma: PrismaService) {}

  async getRecommendation(dto: GetRecommendationDto) {
    const providers = await this.prisma.providerProfile.findMany({
      where: {
        isAvailable: true,
        isActive: true,
        isVerified: true,
        currentLat: { not: null },
        currentLng: { not: null },
        providerServices: {
          some: {
            serviceCategory: { slug: dto.serviceCategory },
          },
        },
      },
      include: {
        providerServices: { include: { serviceCategory: true } },
        user: true,
      },
    });

    const homeVisitCandidates = providers
      .filter((p) => p.homeVisitEnabled)
      .map((p) => ({
        provider: p,
        distance: haversineDistance(
          dto.lat,
          dto.lng,
          p.currentLat!,
          p.currentLng!,
        ),
      }))
      .filter((p) => p.distance <= p.provider.serviceRadius);

    const doctorPlaceCandidates = providers
      .filter((p) => p.doctorPlaceVisitEnabled)
      .map((p) => ({
        provider: p,
        distance: haversineDistance(
          dto.lat,
          dto.lng,
          p.currentLat!,
          p.currentLng!,
        ),
      }))
      .filter((p) => p.distance <= p.provider.serviceRadius);

    const maxDistance = Math.max(
      ...homeVisitCandidates.map((p) => p.distance),
      ...doctorPlaceCandidates.map((p) => p.distance),
      1,
    );
    const maxFee = Math.max(
      ...providers.map((p) =>
        Math.max(p.consultationFeeHomeVisit, p.consultationFeeDoctorPlace),
      ),
      1,
    );

    let homeVisitResult = null;
    if (homeVisitCandidates.length > 0) {
      const scored = homeVisitCandidates
        .map((c) => ({
          ...c,
          score: calculateScore(
            c.provider.isAvailable,
            c.distance,
            c.provider.consultationFeeHomeVisit,
            dto.urgency,
            maxDistance,
            maxFee,
          ),
        }))
        .sort((a, b) => b.score - a.score);

      const best = scored[0];
      homeVisitResult = {
        provider: best.provider,
        distance: best.distance,
        eta: Math.round(best.distance * ETA_MULTIPLIERS.homeVisit),
        fee: best.provider.consultationFeeHomeVisit,
        score: best.score,
      };
    }

    let doctorPlaceResult = null;
    if (doctorPlaceCandidates.length > 0) {
      const scored = doctorPlaceCandidates
        .map((c) => ({
          ...c,
          score: calculateScore(
            c.provider.isAvailable,
            c.distance,
            c.provider.consultationFeeDoctorPlace,
            dto.urgency,
            maxDistance,
            maxFee,
          ),
        }))
        .sort((a, b) => b.score - a.score);

      const best = scored[0];
      doctorPlaceResult = {
        provider: best.provider,
        distance: best.distance,
        eta: Math.round(best.distance * ETA_MULTIPLIERS.doctorPlace),
        fee: best.provider.consultationFeeDoctorPlace,
        score: best.score,
      };
    }

    let recommended: 'HOME_VISIT' | 'DOCTOR_PLACE' = 'HOME_VISIT';
    let reason = '';

    if (!homeVisitResult && !doctorPlaceResult) {
      return {
        homeVisit: null,
        doctorPlace: null,
        recommended: null,
        reason: 'No providers available in your area at this time.',
      };
    }

    if (!homeVisitResult) {
      recommended = 'DOCTOR_PLACE';
      reason =
        'No home visit providers are available. Visit the clinic for faster service.';
    } else if (!doctorPlaceResult) {
      recommended = 'HOME_VISIT';
      reason = 'A doctor can visit you at home conveniently.';
    } else if (dto.urgency === 'HIGH') {
      if (homeVisitResult.score >= doctorPlaceResult.score) {
        recommended = 'HOME_VISIT';
        reason = 'For urgent care, a home visit provides the fastest response.';
      } else {
        recommended = 'DOCTOR_PLACE';
        reason =
          'Visiting the clinic is recommended for urgent care with full diagnostic support.';
      }
    } else if (homeVisitResult.fee <= doctorPlaceResult.fee) {
      recommended = 'HOME_VISIT';
      reason = 'Home visit is more cost-effective and convenient for you.';
    } else {
      recommended = 'DOCTOR_PLACE';
      reason =
        'Visiting the clinic gives you access to full medical facilities at a lower cost.';
    }

    return {
      homeVisit: homeVisitResult,
      doctorPlace: doctorPlaceResult,
      recommended,
      reason,
    };
  }
}

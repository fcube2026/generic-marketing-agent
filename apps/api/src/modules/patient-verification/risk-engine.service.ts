import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RiskTier } from '@prisma/client';
import { differenceInYears, getHours } from 'date-fns';

export interface RiskEngineInput {
  patientId: string;
  totalFee: number;
  scheduledAt: Date;
}

export interface RiskEngineResult {
  score: number;
  tier: RiskTier;
  triggers: string[];
}

@Injectable()
export class RiskEngineService {
  private readonly logger = new Logger(RiskEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async computeRiskScore(input: RiskEngineInput): Promise<RiskEngineResult> {
    const { patientId, totalFee, scheduledAt } = input;
    const triggers: string[] = [];
    let score = 0;

    const profile = await this.prisma.patientProfile.findUnique({
      where: { id: patientId },
      select: {
        dateOfBirth: true,
        isFlagged: true,
        trustScore: true,
        bookings: {
          where: { status: 'COMPLETED' },
          select: { id: true },
        },
      },
    });

    if (!profile) {
      return { score: 20, tier: RiskTier.LOW, triggers: ['FIRST_BOOKING'] };
    }

    const completedBookings = profile.bookings.length;

    // First booking
    if (completedBookings === 0) {
      score += 20;
      triggers.push('FIRST_BOOKING');
    }

    // Minor patient
    if (profile.dateOfBirth) {
      const age = differenceInYears(new Date(), profile.dateOfBirth);
      if (age < 18) {
        score += 25;
        triggers.push('MINOR_PATIENT');
      }
    }

    // High-value service
    if (totalFee > 2000) {
      score += 15;
      triggers.push('HIGH_VALUE');
    }

    // Late-night visit
    const hour = getHours(scheduledAt);
    if (hour >= 22 || hour < 6) {
      score += 20;
      triggers.push('LATE_NIGHT');
    }

    // Repeat good patient (2+ completed)
    if (completedBookings >= 2) {
      score -= 20;
      triggers.push('REPEAT_PATIENT');
    }

    // Check for suspicious activity: 3+ bookings in last 24 h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await this.prisma.booking.count({
      where: {
        patientId,
        createdAt: { gte: oneDayAgo },
      },
    });
    if (recentCount >= 3) {
      score += 30;
      triggers.push('SUSPICIOUS_ACTIVITY');
    }

    // Provider-flagged patient
    if (profile.isFlagged) {
      score += 40;
      triggers.push('PROVIDER_FLAGGED');
    }

    // Trust score integration
    const trustScore = profile.trustScore ?? 50;
    if (trustScore >= 80) {
      score -= 15;
    } else if (trustScore >= 30 && trustScore < 50) {
      score += 5;
    } else if (trustScore < 30) {
      score += 20;
    }

    // Clamp to 0
    score = Math.max(0, score);

    const tier =
      score >= 80
        ? RiskTier.CRITICAL
        : score >= 55
          ? RiskTier.HIGH
          : score >= 30
            ? RiskTier.MEDIUM
            : RiskTier.LOW;

    this.logger.debug(
      `Risk score for patient ${patientId}: ${score} (${tier}) triggers=[${triggers.join(',')}]`,
    );

    return { score, tier, triggers };
  }
}

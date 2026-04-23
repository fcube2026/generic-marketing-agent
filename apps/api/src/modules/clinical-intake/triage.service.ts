import { Injectable } from '@nestjs/common';
import { TriageLevel } from '@prisma/client';

const EMERGENCY_KEYWORDS = [
  'chest pain',
  'heart attack',
  'unconscious',
  'not breathing',
  'stroke',
  'paralysis',
  'severe bleeding',
  'overdose',
  'seizure',
  'fits',
  'coughing blood',
  'anaphylaxis',
  'severe allergic reaction',
  'suicidal',
  'self harm',
];

const URGENT_KEYWORDS = [
  'high fever',
  'difficulty breathing',
  'shortness of breath',
  'severe headache',
  'sudden confusion',
  'diabetic emergency',
  'blood sugar very low',
  "can't walk",
  'cannot walk',
  'broken bone',
  'fracture',
];

export interface TriageResult {
  triageLevel: TriageLevel;
  triageFlags: string[];
  emergencyRedirected: boolean;
  bannerMessage: string | null;
}

@Injectable()
export class TriageService {
  analyze(text: string): TriageResult {
    const lower = text.toLowerCase();
    const triageFlags: string[] = [];

    const hasEmergency = EMERGENCY_KEYWORDS.some((kw) => {
      if (lower.includes(kw)) {
        triageFlags.push(kw.toUpperCase().replace(/ /g, '_'));
        return true;
      }
      return false;
    });

    if (hasEmergency) {
      return {
        triageLevel: TriageLevel.EMERGENCY,
        triageFlags,
        emergencyRedirected: false,
        bannerMessage:
          '⚠️ Your symptoms may require immediate care. Please call 108 or go to the nearest emergency room.',
      };
    }

    const hasUrgent = URGENT_KEYWORDS.some((kw) => {
      if (lower.includes(kw)) {
        triageFlags.push(kw.toUpperCase().replace(/ /g, '_'));
        return true;
      }
      return false;
    });

    if (hasUrgent) {
      return {
        triageLevel: TriageLevel.URGENT,
        triageFlags,
        emergencyRedirected: false,
        bannerMessage:
          'Your symptoms suggest you may need urgent attention. A doctor will be dispatched as soon as possible.',
      };
    }

    return {
      triageLevel: TriageLevel.STANDARD,
      triageFlags: [],
      emergencyRedirected: false,
      bannerMessage: null,
    };
  }
}

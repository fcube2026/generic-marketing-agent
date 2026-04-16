import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FaceVerificationRequest {
  /** Base64-encoded live face capture or URL to face image. */
  liveFaceData: string;
  /** URL or base64 of reference image (e.g. from SMC portal). */
  referenceImageData?: string;
  providerId: string;
}

export interface FaceVerificationResult {
  match: boolean;
  similarityScore: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  rawResponse?: Record<string, unknown>;
}

/**
 * Face verification provider.
 *
 * In production this delegates to a Python ML microservice
 * (face_recognition / DeepFace) running at FACE_VERIFY_URL.
 * For staging / mock mode it returns a simulated match.
 *
 * Configure via:
 *   FACE_VERIFY_ENABLED=true  — enable live ML verification
 *   FACE_VERIFY_URL           — URL of the Python face verification service
 */
@Injectable()
export class FaceVerificationProvider {
  private readonly logger = new Logger(FaceVerificationProvider.name);
  private readonly enabled: boolean;
  private readonly serviceUrl: string | undefined;

  constructor(private config: ConfigService) {
    this.enabled = config.get<string>('FACE_VERIFY_ENABLED') === 'true';
    this.serviceUrl = config.get<string>('FACE_VERIFY_URL');
  }

  async verify(req: FaceVerificationRequest): Promise<FaceVerificationResult> {
    if (!this.enabled) {
      return this.mockVerify(req);
    }
    return this.callFaceService(req);
  }

  private mockVerify(req: FaceVerificationRequest): FaceVerificationResult {
    this.logger.log(
      `[face-mock] Running face verification for provider: ${req.providerId}`,
    );
    // Mock: simulate a match when liveFaceData is provided and non-empty
    const match = !!req.liveFaceData && req.liveFaceData.length > 10;
    const similarityScore = match ? 0.87 : 0.42;
    return {
      match,
      similarityScore,
      confidence: match ? 'HIGH' : 'LOW',
      rawResponse: { source: 'mock', similarity: similarityScore },
    };
  }

  private async callFaceService(
    req: FaceVerificationRequest,
  ): Promise<FaceVerificationResult> {
    if (!this.serviceUrl) {
      throw new Error(
        'FACE_VERIFY_URL must be set when FACE_VERIFY_ENABLED=true',
      );
    }

    this.logger.log(
      `[face-service] Sending face verification for provider: ${req.providerId}`,
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45_000);

    let response: Response;
    try {
      response = await fetch(`${this.serviceUrl}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          live_face: req.liveFaceData,
          reference_image: req.referenceImageData,
          provider_id: req.providerId,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      this.logger.warn(
        `[face-service] Error ${response.status}: ${JSON.stringify(data)}`,
      );
      throw new Error(
        `Face verification service returned HTTP ${response.status}`,
      );
    }

    const similarityScore = (data.similarity_score as number) ?? 0;
    const match = (data.match as boolean) ?? similarityScore >= 0.6;

    return {
      match,
      similarityScore,
      confidence:
        similarityScore >= 0.8
          ? 'HIGH'
          : similarityScore >= 0.6
            ? 'MEDIUM'
            : 'LOW',
      rawResponse: data,
    };
  }
}

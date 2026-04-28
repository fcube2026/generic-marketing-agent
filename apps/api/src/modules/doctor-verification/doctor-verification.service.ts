import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NmcApiProvider } from './providers/nmc-api.provider';
import { SmcScraperProvider } from './providers/smc-scraper.provider';
import { FaceVerificationProvider } from './providers/face-verification.provider';
import { AadhaarValidationProvider } from './providers/aadhaar-validation.provider';
import { SubmitNmcVerificationDto } from './dto/submit-nmc-verification.dto';
import { SubmitFaceVerificationDto } from './dto/submit-face-verification.dto';
import { SubmitVerificationDocumentsDto } from './dto/submit-verification-documents.dto';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ISSUE_CODES,
  IssueCode,
  ISSUE_CODE_LABELS,
  CONFIDENCE_WEIGHTS,
} from './constants/issue-codes';

/** Maximum automatic retry attempts before routing to manual review. */
const MAX_AUTO_ATTEMPTS = 3;

/** Source tags stored in ProviderLicense.verificationSource. */
const SOURCE_NMC_API = 'NMC_API';
const SOURCE_SMC_PORTAL = 'SMC_PORTAL';
const SOURCE_FACE = 'FACE';

export type VerificationLogStatus =
  | 'SUCCESS'
  | 'NOT_FOUND'
  | 'ERROR'
  | 'MANUAL_REVIEW';

export interface PipelineStepResult {
  source: string;
  found: boolean;
  score: number;
  details: Record<string, unknown>;
  error?: string;
}

export interface VerificationPipelineResult {
  issueCode: IssueCode;
  issueLabel: string;
  confidenceScore: number;
  overallStatus: VerificationLogStatus;
  steps: PipelineStepResult[];
  faceMatch?: boolean;
  faceSimilarity?: number;
}

@Injectable()
export class DoctorVerificationService {
  private readonly logger = new Logger(DoctorVerificationService.name);

  constructor(
    private prisma: PrismaService,
    private nmcProvider: NmcApiProvider,
    private smcProvider: SmcScraperProvider,
    private faceProvider: FaceVerificationProvider,
    private aadhaarProvider: AadhaarValidationProvider,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Doctor submits their NMC registration details for automated verification.
   * Runs a multi-step pipeline: NMC API -> SMC portal -> confidence scoring.
   * Idempotent: if already approved and within re-verification window, returns cached result.
   */
  async submitForVerification(userId: string, dto: SubmitNmcVerificationDto) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');

    // Validate completeness
    if (
      !dto.nmcRegistrationNumber?.trim() ||
      !dto.yearOfAdmission?.trim() ||
      !dto.fullName?.trim()
    ) {
      return {
        status: 'INCOMPLETE',
        cached: false,
        issueCode: ISSUE_CODES.INCOMPLETE_SUBMISSION,
        issueLabel: ISSUE_CODE_LABELS[ISSUE_CODES.INCOMPLETE_SUBMISSION],
        confidenceScore: 0,
      };
    }

    let license = dto.licenseId
      ? await this.prisma.providerLicense.findFirst({
          where: { id: dto.licenseId, providerId: profile.id },
        })
      : null;

    if (!license) {
      license = await this.prisma.providerLicense.create({
        data: {
          providerId: profile.id,
          type: 'MEDICAL_REGISTRATION',
          documentUrl: '',
          status: 'PENDING',
          nmcRegistrationNumber: dto.nmcRegistrationNumber,
          stateCouncil: dto.stateCouncil,
          yearOfAdmission: dto.yearOfAdmission,
        },
      });
    } else {
      license = await this.prisma.providerLicense.update({
        where: { id: license.id },
        data: {
          nmcRegistrationNumber: dto.nmcRegistrationNumber,
          stateCouncil: dto.stateCouncil,
          yearOfAdmission: dto.yearOfAdmission,
        },
      });
    }

    // Return cached result if still fresh
    if (
      license.status === 'APPROVED' &&
      license.nextReverificationDue &&
      license.nextReverificationDue > new Date()
    ) {
      return {
        status: 'APPROVED',
        license,
        cached: true,
        issueCode: ISSUE_CODES.FULLY_VERIFIED,
        issueLabel: ISSUE_CODE_LABELS[ISSUE_CODES.FULLY_VERIFIED],
        confidenceScore: 100,
      };
    }

    const result = await this.runVerificationPipeline(profile.id, license, dto);
    return { ...result, cached: false };
  }

  /**
   * Submit face verification data for the current provider.
   */
  async submitFaceVerification(userId: string, dto: SubmitFaceVerificationDto) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');

    let faceResult;
    try {
      faceResult = await this.faceProvider.verify({
        liveFaceData: dto.liveFaceData,
        referenceImageData: dto.referenceImageData,
        providerId: profile.id,
      });
    } catch (err) {
      this.logger.error(`Face verification error: ${String(err)}`);
      faceResult = {
        match: false,
        similarityScore: 0,
        confidence: 'LOW' as const,
        rawResponse: { error: String(err) },
      };
    }

    await this.prisma.doctorVerificationLog.create({
      data: {
        providerId: profile.id,
        licenseId: null,
        registrationNumber: 'FACE_CHECK',
        stateCouncil: 'N/A',
        verificationSource: SOURCE_FACE,
        status: faceResult.match ? 'SUCCESS' : 'NOT_FOUND',
        rawRequest: {
          providerId: profile.id,
        } as unknown as Prisma.InputJsonValue,
        rawResponse: faceResult.rawResponse as unknown as Prisma.InputJsonValue,
        errorCode: faceResult.match ? null : 'FACE_MISMATCH',
      },
    });

    return {
      match: faceResult.match,
      similarityScore: faceResult.similarityScore,
      confidence: faceResult.confidence,
      issueCode: faceResult.match
        ? ISSUE_CODES.PENDING_ADMIN_APPROVAL
        : ISSUE_CODES.FACE_MISMATCH,
      issueLabel: faceResult.match
        ? ISSUE_CODE_LABELS[ISSUE_CODES.PENDING_ADMIN_APPROVAL]
        : ISSUE_CODE_LABELS[ISSUE_CODES.FACE_MISMATCH],
    };
  }

  /**
   * Doctor uploads Aadhaar + medical certificate documents.
   * Stores the URLs in the ProviderLicense and creates an audit log entry.
   */
  async submitVerificationDocuments(
    userId: string,
    dto: SubmitVerificationDocumentsDto,
  ) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');

    let license = dto.licenseId
      ? await this.prisma.providerLicense.findFirst({
          where: { id: dto.licenseId, providerId: profile.id },
        })
      : await this.prisma.providerLicense.findFirst({
          where: {
            providerId: profile.id,
            type: 'MEDICAL_REGISTRATION',
          },
          orderBy: { createdAt: 'desc' },
        });

    // Persist both URLs as a JSON string in the single documentUrl column.
    // A future schema migration can split these into aadhaarUrl / medicalCertUrl fields.
    const documentUrls = JSON.stringify({
      aadhaar: dto.aadhaarDocumentUrl,
      medicalCertificate: dto.medicalCertificateUrl,
    });

    if (license) {
      license = await this.prisma.providerLicense.update({
        where: { id: license.id },
        data: { documentUrl: documentUrls },
      });
    } else {
      license = await this.prisma.providerLicense.create({
        data: {
          providerId: profile.id,
          type: 'MEDICAL_REGISTRATION',
          documentUrl: documentUrls,
          status: 'PENDING',
        },
      });
    }

    // Validate Aadhaar number if provided
    let aadhaarValidation: { valid: boolean } | null = null;
    if (dto.aadhaarNumber) {
      try {
        aadhaarValidation = await this.aadhaarProvider.validate(
          dto.aadhaarNumber,
        );
      } catch (err) {
        this.logger.warn(`Aadhaar validation error: ${String(err)}`);
        aadhaarValidation = { valid: false };
      }
    }

    await this.prisma.doctorVerificationLog.create({
      data: {
        providerId: profile.id,
        licenseId: license.id,
        registrationNumber:
          license.nmcRegistrationNumber ?? 'DOCUMENT_UPLOAD_STAGE',
        stateCouncil: license.stateCouncil ?? 'N/A',
        verificationSource: 'DOCUMENT_UPLOAD',
        status: 'NOT_FOUND',
        rawRequest: {
          providerId: profile.id,
        } as unknown as Prisma.InputJsonValue,
        rawResponse: {
          aadhaarDocumentUrl: dto.aadhaarDocumentUrl,
          medicalCertificateUrl: dto.medicalCertificateUrl,
          aadhaarValidation,
        } as unknown as Prisma.InputJsonValue,
        errorCode: null,
      },
    });

    this.logger.log(`Documents uploaded for provider: ${profile.id}`);

    return {
      licenseId: license.id,
      documentsReceived: true,
      aadhaarValid: aadhaarValidation?.valid ?? null,
      message: 'Documents uploaded successfully. Proceed to face verification.',
    };
  }

  /**
   * Records the doctor's consent to fetch documents from DigiLocker.
   * Actual DigiLocker OAuth requires credentials configured separately.
   */
  async recordDigilockerConsent(userId: string, licenseId?: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');

    const resolvedLicenseId =
      licenseId ??
      (
        await this.prisma.providerLicense.findFirst({
          where: {
            providerId: profile.id,
            type: 'MEDICAL_REGISTRATION',
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        })
      )?.id ??
      null;

    await this.prisma.doctorVerificationLog.create({
      data: {
        providerId: profile.id,
        licenseId: resolvedLicenseId,
        registrationNumber: 'DIGILOCKER_CONSENT',
        stateCouncil: 'N/A',
        verificationSource: 'DIGILOCKER_CONSENT',
        status: 'NOT_FOUND',
        rawRequest: {
          providerId: profile.id,
          consentGiven: true,
          consentAt: new Date().toISOString(),
        } as unknown as Prisma.InputJsonValue,
        rawResponse: {
          message: 'User consented to DigiLocker document fetch',
        } as unknown as Prisma.InputJsonValue,
        errorCode: null,
      },
    });

    this.logger.log(`DigiLocker consent recorded for provider: ${profile.id}`);

    return {
      consentRecorded: true,
      message:
        'DigiLocker consent recorded. Your documents will be fetched securely during review.',
    };
  }

  /**
   * Admin or background job triggers a fresh NMC check for an existing license.
   */
  async retryVerification(licenseId: string, adminId: string) {
    const license = await this.prisma.providerLicense.findUnique({
      where: { id: licenseId },
    });
    if (!license) throw new NotFoundException('License not found');

    if (!license.nmcRegistrationNumber) {
      throw new BadRequestException(
        'License does not have a registration number. The doctor must submit it first.',
      );
    }

    await this.prisma.adminAction.create({
      data: {
        adminId,
        action: 'RETRY_NMC_VERIFICATION',
        targetId: licenseId,
        targetType: 'ProviderLicense',
      },
    });

    const dto: SubmitNmcVerificationDto = {
      fullName: '',
      nmcRegistrationNumber: license.nmcRegistrationNumber,
      stateCouncil: license.stateCouncil,
      yearOfAdmission: license.yearOfAdmission ?? '',
    };

    return this.runVerificationPipeline(license.providerId, license, dto);
  }

  /**
   * Returns the paginated list of licenses waiting for manual review.
   */
  async getVerificationQueue(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.providerLicense.findMany({
        where: {
          type: 'MEDICAL_REGISTRATION',
          status: 'PENDING',
          verificationSource: null,
          nmcRegistrationNumber: { not: null },
        },
        include: {
          provider: {
            include: { user: true },
          },
        },
        skip,
        take: limit,
        orderBy: { lastAttemptAt: 'asc' },
      }),
      this.prisma.providerLicense.count({
        where: {
          type: 'MEDICAL_REGISTRATION',
          status: 'PENDING',
          verificationSource: null,
          nmcRegistrationNumber: { not: null },
        },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Returns all verification logs for a provider by their userId (audit trail).
   */
  async getVerificationLogs(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');

    return this.prisma.doctorVerificationLog.findMany({
      where: { providerId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Returns the full verification detail for a specific provider (for admin view).
   */
  async getProviderVerificationDetail(providerId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { id: providerId },
      include: {
        user: true,
        licenses: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!profile) throw new NotFoundException('Provider not found');

    const logs = await this.prisma.doctorVerificationLog.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
    });

    const latestPipelineResult = this.deriveLatestPipelineResult(logs);

    return {
      provider: profile,
      logs,
      ...latestPipelineResult,
    };
  }

  // ---- Internal helpers -------------------------------------------------------

  /**
   * Runs the multi-step verification pipeline:
   * 1. NMC API (Surepass / Decentro / IDfy)
   * 2. SMC portal scraper
   * Then computes confidence score and issue code.
   */
  private async runVerificationPipeline(
    providerId: string,
    license: {
      id: string;
      nmcRegistrationNumber: string | null;
      stateCouncil: string | null;
      yearOfAdmission: string | null;
      verificationAttempts: number;
    },
    dto: SubmitNmcVerificationDto,
  ): Promise<
    VerificationPipelineResult & {
      status: VerificationLogStatus;
      license: unknown;
    }
  > {
    const {
      id: licenseId,
      nmcRegistrationNumber,
      stateCouncil,
      yearOfAdmission,
      verificationAttempts,
    } = license;

    if (!nmcRegistrationNumber) {
      throw new BadRequestException(
        'Registration number is required for verification',
      );
    }

    // Use empty string when stateCouncil is not provided — the Surepass API
    // resolves the state council internally from the registration number.
    const resolvedStateCouncil = stateCouncil ?? '';

    const updatedAttempts = verificationAttempts + 1;
    await this.prisma.providerLicense.update({
      where: { id: licenseId },
      data: {
        verificationAttempts: updatedAttempts,
        lastAttemptAt: new Date(),
      },
    });

    const steps: PipelineStepResult[] = [];

    // Step 1: NMC API
    let nmcFound = false;
    let nmcNameMatch = false;
    const nmcRequest = {
      memberId: nmcRegistrationNumber,
      stateCouncil: resolvedStateCouncil,
      yearOfAdmission: yearOfAdmission ?? '',
    };

    try {
      const nmcResult = await this.nmcProvider.verify(nmcRequest);
      nmcFound = nmcResult.found;

      if (nmcFound && dto.fullName && nmcResult.name) {
        nmcNameMatch = this.namesMatch(dto.fullName, nmcResult.name);
      } else if (nmcFound) {
        nmcNameMatch = true;
      }

      const nmcScore =
        nmcFound && nmcNameMatch
          ? CONFIDENCE_WEIGHTS.NMC_API
          : nmcFound
            ? Math.floor(CONFIDENCE_WEIGHTS.NMC_API * 0.7)
            : 0;

      steps.push({
        source: SOURCE_NMC_API,
        found: nmcFound,
        score: nmcScore,
        details: {
          registrationNumber: nmcResult.registrationNumber,
          name: nmcResult.name,
          qualifications: nmcResult.qualifications,
          registrationStatus: nmcResult.registrationStatus,
          nameMatch: nmcNameMatch,
        },
      });

      this.logger.log(
        `NMC check: ${nmcFound ? 'FOUND' : 'NOT_FOUND'} — ${nmcRegistrationNumber}`,
      );
    } catch (err) {
      steps.push({
        source: SOURCE_NMC_API,
        found: false,
        score: 0,
        details: {},
        error: String(err),
      });
      this.logger.warn(`NMC API error: ${String(err)}`);
    }

    // Step 2: SMC Portal
    let smcFound = false;
    let smcNameMatch = false;

    try {
      const smcResult = await this.smcProvider.verify({
        registrationNumber: nmcRegistrationNumber,
        fullName: dto.fullName ?? '',
        stateCouncil: resolvedStateCouncil,
      });
      smcFound = smcResult.found;

      if (smcFound && dto.fullName && smcResult.name) {
        smcNameMatch = this.namesMatch(dto.fullName, smcResult.name);
      } else if (smcFound) {
        smcNameMatch = true;
      }

      const smcScore =
        smcFound && smcNameMatch
          ? CONFIDENCE_WEIGHTS.SMC_PORTAL
          : smcFound
            ? Math.floor(CONFIDENCE_WEIGHTS.SMC_PORTAL * 0.7)
            : 0;

      steps.push({
        source: SOURCE_SMC_PORTAL,
        found: smcFound,
        score: smcScore,
        details: {
          name: smcResult.name,
          registrationNumber: smcResult.registrationNumber,
          status: smcResult.status,
          councilName: smcResult.councilName,
          screenshotUrl: smcResult.screenshotUrl,
          nameMatch: smcNameMatch,
        },
      });

      this.logger.log(
        `SMC check: ${smcFound ? 'FOUND' : 'NOT_FOUND'} — ${nmcRegistrationNumber} / ${resolvedStateCouncil}`,
      );
    } catch (err) {
      steps.push({
        source: SOURCE_SMC_PORTAL,
        found: false,
        score: 0,
        details: {},
        error: String(err),
      });
      this.logger.warn(`SMC portal error: ${String(err)}`);
    }

    // Confidence Score
    const confidenceScore = steps.reduce((sum, s) => sum + s.score, 0);

    // Issue Code Determination
    const dataMismatch =
      (steps.some((s) => s.source === SOURCE_NMC_API && s.found) &&
        !nmcNameMatch) ||
      (steps.some((s) => s.source === SOURCE_SMC_PORTAL && s.found) &&
        !smcNameMatch);

    const issueCode = this.computeIssueCode({
      nmcFound,
      smcFound,
      confidenceScore,
      dataMismatch,
    });

    // Update DB — pipeline never auto-approves; always routes to admin review
    let overallStatus: VerificationLogStatus;
    overallStatus =
      updatedAttempts >= MAX_AUTO_ATTEMPTS ? 'MANUAL_REVIEW' : 'NOT_FOUND';

    if (issueCode === ISSUE_CODES.DATA_MISMATCH) {
      overallStatus = 'NOT_FOUND';
    }

    const updatedLicense = await this.prisma.providerLicense.update({
      where: { id: licenseId },
      data: {
        status: 'PENDING',
        verificationSource: 'PIPELINE',
      },
    });

    // Notify doctor that submission was received and is pending review
    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: providerId },
      select: { userId: true },
    });
    if (provider) {
      await this.notificationsService.sendNotification(
        {
          userId: provider.userId,
          title: 'Verification Submitted',
          message:
            'Your verification details have been received and are pending admin review. You will be notified once approved.',
          type: 'NMC_VERIFICATION_SUBMITTED',
          metadata: { providerId, licenseId, issueCode, confidenceScore },
        },
        {
          inApp: true,
          push: true,
          sms: false,
        },
      );
    }

    this.logger.log(
      `Verification ${overallStatus} (code ${issueCode}, score ${confidenceScore}): ${nmcRegistrationNumber} — awaiting admin approval`,
    );

    // Persist Log
    const errorCode =
      issueCode === ISSUE_CODES.DATA_MISMATCH
        ? 'DATA_MISMATCH'
        : issueCode === ISSUE_CODES.NOT_FOUND_NEEDS_SMC_EMAIL
          ? 'DOCTOR_NOT_FOUND'
          : null;

    await this.prisma.doctorVerificationLog.create({
      data: {
        providerId,
        licenseId,
        registrationNumber: nmcRegistrationNumber,
        stateCouncil,
        verificationSource: 'PIPELINE',
        status: overallStatus,
        rawRequest: {
          ...nmcRequest,
          fullName: dto.fullName,
        } as unknown as Prisma.InputJsonValue,
        rawResponse: {
          issueCode,
          issueLabel: ISSUE_CODE_LABELS[issueCode],
          confidenceScore,
          steps,
        } as unknown as Prisma.InputJsonValue,
        errorCode,
      },
    });

    return {
      status: overallStatus,
      license: updatedLicense,
      issueCode,
      issueLabel: ISSUE_CODE_LABELS[issueCode],
      confidenceScore,
      overallStatus,
      steps,
    };
  }

  /**
   * Compute the issue code based on pipeline results.
   * The pipeline never auto-approves; both FULLY_VERIFIED and VERIFIED_VIA_DOCUMENTS
   * are replaced with PENDING_ADMIN_APPROVAL so every submission requires admin review.
   */
  private computeIssueCode(opts: {
    nmcFound: boolean;
    smcFound: boolean;
    confidenceScore: number;
    dataMismatch: boolean;
  }): IssueCode {
    const { nmcFound, smcFound, dataMismatch } = opts;

    if (dataMismatch) return ISSUE_CODES.DATA_MISMATCH;
    if (!nmcFound && !smcFound) return ISSUE_CODES.NOT_FOUND_NEEDS_SMC_EMAIL;
    // At least one source confirmed the registration → route to admin approval
    return ISSUE_CODES.PENDING_ADMIN_APPROVAL;
  }

  /**
   * Fuzzy name matching — normalises and checks for partial overlap.
   */
  private namesMatch(inputName: string, portalName: string): boolean {
    const normalise = (s: string) =>
      s
        .toLowerCase()
        .replace(
          /\b(dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?|shri\.?|smt\.?|kumari\.?|km\.?)\b/g,
          '',
        )
        .replace(/\s+/g, ' ')
        .trim();

    const a = normalise(inputName);
    const b = normalise(portalName);

    if (a === b) return true;

    const tokensA = new Set(a.split(' ').filter(Boolean));
    const tokensB = b.split(' ').filter(Boolean);

    // Single-word names: match if the one token is present in both
    if (tokensA.size === 1 || tokensB.length === 1) {
      const singleA = [...tokensA][0];
      const singleB = tokensB[0];
      return (
        singleA === singleB || tokensB.includes(singleA) || tokensA.has(singleB)
      );
    }

    // Multi-word names: require at least 2 tokens to overlap (handles middle-name variations)
    const overlap = tokensB.filter((t) => tokensA.has(t)).length;
    return overlap >= 2;
  }

  /**
   * Derive the latest confidence score and issue code from stored logs.
   */
  private deriveLatestPipelineResult(
    logs: Array<{
      verificationSource: string;
      rawResponse: Prisma.JsonValue;
      status: string;
    }>,
  ) {
    const pipelineLog = logs.find((l) => l.verificationSource === 'PIPELINE');
    if (!pipelineLog?.rawResponse) {
      return {
        confidenceScore: 0,
        issueCode: null,
        issueLabel: null,
        steps: [],
      };
    }

    const resp = pipelineLog.rawResponse as Record<string, unknown>;
    return {
      confidenceScore: (resp.confidenceScore as number) ?? 0,
      issueCode: (resp.issueCode as number) ?? null,
      issueLabel: (resp.issueLabel as string) ?? null,
      steps: (resp.steps as PipelineStepResult[]) ?? [],
    };
  }
}

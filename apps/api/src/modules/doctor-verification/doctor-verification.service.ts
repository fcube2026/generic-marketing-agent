import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NmcApiProvider } from './providers/nmc-api.provider';
import { SubmitNmcVerificationDto } from './dto/submit-nmc-verification.dto';

/** Verification re-check interval in days. */
const REVERIFICATION_DAYS = 90;

/** Maximum automatic retry attempts before routing to manual review. */
const MAX_AUTO_ATTEMPTS = 3;

/** Source tag stored in ProviderLicense.verificationSource. */
const SOURCE_NMC_API = 'NMC_API';
const SOURCE_MANUAL = 'MANUAL';

export type VerificationLogStatus =
  | 'SUCCESS'
  | 'NOT_FOUND'
  | 'ERROR'
  | 'MANUAL_REVIEW';

@Injectable()
export class DoctorVerificationService {
  private readonly logger = new Logger(DoctorVerificationService.name);

  constructor(
    private prisma: PrismaService,
    private nmcProvider: NmcApiProvider,
  ) {}

  /**
   * Doctor submits their NMC registration details for automated verification.
   * Idempotent: if the same registration number is already approved and within
   * the re-verification window, returns the cached result immediately.
   */
  async submitForVerification(userId: string, dto: SubmitNmcVerificationDto) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');

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
      return { status: 'APPROVED', license, cached: true };
    }

    const result = await this.attemptNmcVerification(profile.id, license);
    return { ...result, cached: false };
  }

  /**
   * Admin or background job triggers a fresh NMC check for an existing license.
   */
  async retryVerification(licenseId: string, adminId: string) {
    const license = await this.prisma.providerLicense.findUnique({
      where: { id: licenseId },
    });
    if (!license) throw new NotFoundException('License not found');

    if (!license.nmcRegistrationNumber || !license.stateCouncil) {
      throw new BadRequestException(
        'License does not have NMC registration details. The doctor must submit them first.',
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

    return this.attemptNmcVerification(license.providerId, license);
  }

  /**
   * Returns the paginated list of licenses waiting for manual review
   * (NOT_FOUND or exceeded auto-retry attempts).
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

  // ─── Internal helpers ──────────────────────────────────────────────────────

  private async attemptNmcVerification(
    providerId: string,
    license: {
      id: string;
      nmcRegistrationNumber: string | null;
      stateCouncil: string | null;
      yearOfAdmission: string | null;
      verificationAttempts: number;
    },
  ) {
    const {
      id: licenseId,
      nmcRegistrationNumber,
      stateCouncil,
      yearOfAdmission,
      verificationAttempts,
    } = license;

    if (!nmcRegistrationNumber || !stateCouncil) {
      throw new BadRequestException(
        'NMC registration number and state council are required for verification',
      );
    }

    const updatedAttempts = verificationAttempts + 1;

    await this.prisma.providerLicense.update({
      where: { id: licenseId },
      data: {
        verificationAttempts: updatedAttempts,
        lastAttemptAt: new Date(),
      },
    });

    const request = {
      memberId: nmcRegistrationNumber,
      stateCouncil: stateCouncil,
      yearOfAdmission: yearOfAdmission ?? '',
    };

    let logStatus: VerificationLogStatus;
    let rawResponse: Record<string, unknown> | undefined;
    let errorCode: string | undefined;
    let updatedLicense: unknown;

    try {
      const result = await this.nmcProvider.verify(request);
      rawResponse = result.rawResponse;

      if (result.found) {
        logStatus = 'SUCCESS';
        const nextReverification = new Date();
        nextReverification.setDate(
          nextReverification.getDate() + REVERIFICATION_DAYS,
        );

        updatedLicense = await this.prisma.providerLicense.update({
          where: { id: licenseId },
          data: {
            status: 'APPROVED',
            verifiedAt: new Date(),
            verificationSource: SOURCE_NMC_API,
            nextReverificationDue: nextReverification,
          },
        });

        await this.prisma.providerProfile.update({
          where: { id: providerId },
          data: { isVerified: true, isActive: true },
        });

        const provider = await this.prisma.providerProfile.findUnique({
          where: { id: providerId },
          select: { userId: true },
        });
        if (provider) {
          await this.prisma.notification.create({
            data: {
              userId: provider.userId,
              title: 'Registration Verified',
              message:
                'Your NMC medical registration has been verified successfully. You can now start accepting bookings.',
              type: 'PROVIDER_APPROVED',
              metadata: { providerId, licenseId, source: SOURCE_NMC_API },
            },
          });
        }

        this.logger.log(
          `NMC verification SUCCESS: ${nmcRegistrationNumber} (provider ${providerId})`,
        );
      } else {
        // Not found in NMC records
        logStatus =
          updatedAttempts >= MAX_AUTO_ATTEMPTS ? 'MANUAL_REVIEW' : 'NOT_FOUND';
        errorCode = 'DOCTOR_NOT_FOUND';

        updatedLicense = await this.prisma.providerLicense.update({
          where: { id: licenseId },
          data: {
            status: 'PENDING',
            verificationSource:
              logStatus === 'MANUAL_REVIEW' ? SOURCE_MANUAL : null,
          },
        });

        this.logger.warn(
          `NMC verification NOT_FOUND: ${nmcRegistrationNumber} (attempt ${updatedAttempts}/${MAX_AUTO_ATTEMPTS})`,
        );
      }
    } catch (err) {
      logStatus = 'ERROR';
      errorCode = 'API_ERROR';
      rawResponse = { error: String(err) };

      updatedLicense = await this.prisma.providerLicense.findUnique({
        where: { id: licenseId },
      });

      this.logger.error(
        `NMC verification ERROR: ${nmcRegistrationNumber} — ${String(err)}`,
      );
    }

    await this.prisma.doctorVerificationLog.create({
      data: {
        providerId,
        licenseId,
        registrationNumber: nmcRegistrationNumber,
        stateCouncil: stateCouncil,
        verificationSource: SOURCE_NMC_API,
        status: logStatus,
        rawRequest: request as any,
        rawResponse: (rawResponse ?? null) as any,
        errorCode: errorCode ?? null,
      },
    });

    return { status: logStatus, license: updatedLicense };
  }
}

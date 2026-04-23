import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AcceptConsentDto } from './dto/accept-consent.dto';
import { PatientVerificationStatus } from '@prisma/client';

/** Full consent text stored verbatim. Versioned to allow future updates. */
const CONSENT_VERSIONS: Record<string, string> = {
  'v1.2': `By booking a home visit on Curex24, you consent to the following:
1. A licensed medical professional will visit your address for the purpose of providing healthcare services.
2. You agree to provide accurate medical history, symptoms, and medications.
3. You understand the visit-start OTP is required before the consultation begins.
4. Your personal and medical data is processed under the DPDP Act 2023 and our Privacy Policy.
5. You may withdraw consent and request data deletion by contacting support@curex24.com.
6. For emergency symptoms, please call 108 immediately.`,
};

const LATEST_VERSION = 'v1.2';

@Injectable()
export class ConsentService {
  constructor(private readonly prisma: PrismaService) {}

  async acceptConsent(
    patientUserId: string,
    dto: AcceptConsentDto,
    ipAddress?: string,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { patient: true, consentRecord: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.patient.userId !== patientUserId)
      throw new ForbiddenException('Not your booking');
    if (booking.consentRecord)
      throw new ConflictException('Consent already accepted for this booking');

    // Guardian validation
    if (dto.isGuardianConsent) {
      if (!dto.guardianName?.trim())
        throw new BadRequestException(
          'Guardian name is required for guardian consent',
        );
      if (!dto.guardianPhone?.trim())
        throw new BadRequestException(
          'Guardian phone is required for guardian consent',
        );
    }

    const version = dto.consentVersion ?? LATEST_VERSION;
    const consentText = CONSENT_VERSIONS[version];
    if (!consentText)
      throw new BadRequestException(`Unknown consent version: ${version}`);

    const record = await this.prisma.consentRecord.create({
      data: {
        patientId: booking.patientId,
        bookingId: dto.bookingId,
        consentVersion: version,
        consentText,
        ipAddress,
        deviceId: dto.deviceId,
        isGuardianConsent: dto.isGuardianConsent ?? false,
        guardianName: dto.guardianName,
        guardianPhone: dto.guardianPhone,
      },
    });

    // Advance verification status to CONSENT_GIVEN
    const verification = await this.prisma.patientVerification.findUnique({
      where: { patientId: booking.patientId },
    });
    if (verification) {
      await this.prisma.patientVerification.update({
        where: { id: verification.id },
        data: { status: PatientVerificationStatus.CONSENT_GIVEN },
      });
      await this.prisma.verificationAuditLog.create({
        data: {
          verificationId: verification.id,
          action: 'CONSENT_ACCEPTED',
          performedBy: patientUserId,
          meta: {
            consentVersion: version,
            isGuardianConsent: dto.isGuardianConsent ?? false,
          },
        },
      });
    }

    return {
      consentId: record.id,
      acceptedAt: record.acceptedAt,
      consentVersion: record.consentVersion,
    };
  }

  async getConsent(userId: string, bookingId: string, role: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { patient: true, consentRecord: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const isPatient = booking.patient.userId === userId;
    if (!isPatient && role !== 'ADMIN')
      throw new ForbiddenException('Access denied');
    if (!booking.consentRecord)
      throw new NotFoundException('No consent record for this booking');

    return {
      consentId: booking.consentRecord.id,
      consentVersion: booking.consentRecord.consentVersion,
      acceptedAt: booking.consentRecord.acceptedAt,
      isGuardianConsent: booking.consentRecord.isGuardianConsent,
    };
  }

  getConsentText(version = LATEST_VERSION) {
    const text = CONSENT_VERSIONS[version];
    if (!text)
      throw new NotFoundException(`Consent version ${version} not found`);
    return { version, text };
  }
}

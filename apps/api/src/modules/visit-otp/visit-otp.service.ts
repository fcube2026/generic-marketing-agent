import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { BookingStatus } from '@prisma/client';

/** OTP TTL in minutes. */
const OTP_TTL_MINUTES = 10;

/** Maximum failed attempts before OTP is locked. */
const MAX_ATTEMPTS = 3;

/** Resend cooldown in minutes. */
const RESEND_COOLDOWN_MINUTES = 2;

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

@Injectable()
export class VisitOtpService {
  private readonly logger = new Logger(VisitOtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
  ) {}

  async sendOtp(providerUserId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        provider: true,
        patient: { include: { user: { select: { phone: true } } } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.provider.userId !== providerUserId)
      throw new ForbiddenException('Not your booking');

    const allowedStatuses: BookingStatus[] = [
      BookingStatus.ACCEPTED,
      BookingStatus.ON_THE_WAY,
      BookingStatus.ARRIVED,
    ];
    if (!allowedStatuses.includes(booking.status))
      throw new BadRequestException(
        `Cannot send OTP for booking in status: ${booking.status}`,
      );

    // Check resend cooldown on existing unexpired OTP
    const existing = await this.prisma.visitOtp.findUnique({
      where: { bookingId },
    });
    if (existing && !existing.verified && existing.expiresAt > new Date()) {
      const elapsedMs = Date.now() - existing.createdAt.getTime();
      if (elapsedMs < RESEND_COOLDOWN_MINUTES * 60 * 1000) {
        const waitSecs = Math.ceil(
          (RESEND_COOLDOWN_MINUTES * 60 * 1000 - elapsedMs) / 1000,
        );
        throw new BadRequestException(
          `Please wait ${waitSecs}s before resending OTP`,
        );
      }
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.prisma.visitOtp.upsert({
      where: { bookingId },
      update: {
        otp,
        expiresAt,
        attempts: 0,
        verified: false,
        verifiedAt: null,
        createdAt: new Date(),
      },
      create: { bookingId, otp, expiresAt },
    });

    const patientPhone = booking.patient.user?.phone;
    if (patientPhone) {
      await this.smsService.sendSms({
        to: patientPhone,
        body: `Your Curex24 visit-start OTP is: ${otp}. Share it with your doctor to begin the consultation. Valid for ${OTP_TTL_MINUTES} minutes.`,
      });
    } else {
      this.logger.warn(
        `No phone for patient of booking ${bookingId} — OTP not sent`,
      );
    }

    return { message: 'OTP sent to patient', otpExpiresAt: expiresAt };
  }

  async verifyOtp(
    providerUserId: string,
    bookingId: string,
    otp: string,
    providerLat?: number,
    providerLng?: number,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { provider: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.provider.userId !== providerUserId)
      throw new ForbiddenException('Not your booking');

    const visitOtp = await this.prisma.visitOtp.findUnique({
      where: { bookingId },
    });
    if (!visitOtp)
      throw new NotFoundException(
        'No OTP exists for this booking. Please send OTP first.',
      );

    if (visitOtp.verified) throw new BadRequestException('OTP already used');
    if (visitOtp.attempts >= MAX_ATTEMPTS)
      throw new BadRequestException(
        'Maximum OTP attempts exceeded. Please contact dispatch.',
      );
    if (visitOtp.expiresAt < new Date())
      throw new BadRequestException(
        'OTP has expired. Please request a new one.',
      );

    if (visitOtp.otp !== otp) {
      await this.prisma.visitOtp.update({
        where: { bookingId },
        data: { attempts: { increment: 1 } },
      });
      const remaining = MAX_ATTEMPTS - (visitOtp.attempts + 1);
      throw new BadRequestException(
        `Invalid OTP. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : 'No attempts remaining. Please contact dispatch.'}`,
      );
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.visitOtp.update({
        where: { bookingId },
        data: { verified: true, verifiedAt: now, providerLat, providerLng },
      }),
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.IN_PROGRESS },
      }),
      this.prisma.bookingStatusHistory.create({
        data: {
          bookingId,
          status: BookingStatus.IN_PROGRESS,
          changedBy: providerUserId,
        },
      }),
    ]);

    return {
      verified: true,
      bookingStatus: BookingStatus.IN_PROGRESS,
      visitStartedAt: now,
    };
  }
}

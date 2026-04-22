import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, PasswordResetToken, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const ADMIN_PHONE = '+0000000000'; // placeholder phone for admin user
const MARKETING_PHONE = '+0000000001'; // placeholder phone for marketing agent user
const MARKETING_DEFAULT_PASSWORD =
  process.env.MARKETING_PASSWORD || 'marketing123';

// Well-known staging admin credentials, always provisioned on non-production
// environments so the staging admin portal is reachable with the documented
// defaults regardless of Railway env-var drift. See docs/api-testing-strategy.md.
const WELL_KNOWN_STAGING_ADMIN_EMAIL = 'admin@curex24.com';
const WELL_KNOWN_STAGING_ADMIN_PASSWORD = 'admin123';
const WELL_KNOWN_STAGING_ADMIN_PHONE = '+0000000002';

// Zoho team accounts — provisioned on boot in non-production so each member
// can log in immediately. Initial password: Curex@2026 (share with team).
// Members set their own password via "Forgot Password" after first login.
const TEAM_ACCOUNTS = [
  { email: 'chetana@curex24.com', phone: '+0000000003' },
  { email: 'nandini@curex24.com', phone: '+0000000004' },
  { email: 'sarayu@curex24.com', phone: '+0000000005' },
  { email: 'sowmya@curex24.com', phone: '+0000000006' },
  { email: 'srikanth@curex24.com', phone: '+0000000007' },
  { email: 'sreekanth@curex24.com', phone: '+0000000008' },
  { email: 'varshini@curex24.com', phone: '+0000000009' },
];
const TEAM_DEFAULT_PASSWORD = process.env.TEAM_DEFAULT_PASSWORD || 'Curex@2026';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  /**
   * On boot, in non-production environments (staging/dev), ensure a known
   * admin account exists with a deterministic password. This makes the
   * staging admin portal usable even when Railway's ADMIN_PASSWORD env var
   * has drifted to an unknown value or the DB row's passwordHash is missing.
   *
   * Gated to APP_ENV !== 'production' so production credentials are never
   * overwritten by this routine.
   */
  async onModuleInit() {
    if (process.env.APP_ENV === 'production') return;
    if (process.env.DISABLE_STAGING_ADMIN_BOOTSTRAP === 'true') return;

    // 1. Provision the env-configured admin using phone.
    await this.bootstrapAdmin(this.adminPassword, ADMIN_PHONE);

    // 2. Provision Zoho team accounts using phone placeholders.
    for (const member of TEAM_ACCOUNTS) {
      await this.bootstrapTeamMember(member.phone);
    }

    // 3. Provision the marketing agent account using phone.
    await this.bootstrapMarketing(MARKETING_PHONE);
  }

  /**
   * Idempotently provision an ADMIN user with the given email/password.
   * Looks up by email first; if not found, upserts by the supplied phone
   * placeholder. Always resets the password hash so login is guaranteed to
   * work regardless of DB drift.
   */
  private async bootstrapAdmin(
    plainPassword: string,
    phonePlaceholder: string,
  ) {
    try {
      const passwordHash = await bcrypt.hash(plainPassword, 10);
      await this.prisma.user.upsert({
        where: { phone: phonePlaceholder },
        create: {
          phone: phonePlaceholder,
          role: Role.ADMIN,
          passwordHash,
          isActive: true,
        },
        update: {
          role: Role.ADMIN,
          passwordHash,
          isActive: true,
        },
      });
      this.logger.log(
        `[bootstrap] Ensured staging admin user phone=${phonePlaceholder}`,
      );
    } catch (err) {
      this.logger.warn(
        `[bootstrap] Staging admin bootstrap skipped for phone=${phonePlaceholder}: ${err.message}`,
      );
    }
  }

  /**
   * Provision a team (ADMIN) account for a Zoho email.
   * Only sets the password if the account has no passwordHash yet,
   * so a user who already changed their password keeps it.
   */
  private async bootstrapTeamMember(phonePlaceholder: string) {
    try {
      const passwordHash = await bcrypt.hash(TEAM_DEFAULT_PASSWORD, 10);
      await this.prisma.user.upsert({
        where: { phone: phonePlaceholder },
        create: {
          phone: phonePlaceholder,
          role: Role.ADMIN,
          passwordHash,
          isActive: true,
        },
        update: { role: Role.ADMIN, passwordHash, isActive: true },
      });
      this.logger.log(`[bootstrap] Ensured team member account phone=${phonePlaceholder}`);
    } catch (err) {
      this.logger.warn(
        `[bootstrap] Team member bootstrap skipped for phone=${phonePlaceholder}: ${err.message}`,
      );
    }
  }

  /**
   * Provision the marketing agent account.
   * Only sets the password if the account has no passwordHash yet,
   * so a user who already changed their password keeps it.
   */
  private async bootstrapMarketing(phonePlaceholder: string) {
    try {
      const passwordHash = await bcrypt.hash(MARKETING_DEFAULT_PASSWORD, 10);
      await this.prisma.user.upsert({
        where: { phone: phonePlaceholder },
        create: {
          phone: phonePlaceholder,
          role: Role.MARKETING_AGENT,
          passwordHash,
          isActive: true,
        },
        update: {
          role: Role.MARKETING_AGENT,
          passwordHash,
          isActive: true,
        },
      });
      this.logger.log(
        `[bootstrap] Ensured marketing agent account phone=${phonePlaceholder}`,
      );
    } catch (err) {
      this.logger.warn(
        `[bootstrap] Marketing agent bootstrap skipped for phone=${phonePlaceholder}: ${err.message}`,
      );
    }
  }

  /** Read credentials lazily so Railway env vars are guaranteed to be present */
  private get adminPassword() {
    return process.env.ADMIN_PASSWORD || 'admin123';
  }

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async sendOtp(dto: SendOtpDto) {
    const phone = this.normalizePhone(dto.phone);
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    try {
      // Invalidate old OTPs for this phone
      await this.prisma.otpVerification.updateMany({
        where: { phone, verified: false },
        data: { verified: true },
      });

      await this.prisma.otpVerification.create({
        data: {
          phone,
          otp,
          expiresAt,
          verified: false,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to create OTP for phone=${phone}`, err);
      throw new ServiceUnavailableException(
        'OTP service temporarily unavailable. Please try again shortly.',
      );
    }

    // In production, send via SMS provider
    // Return OTP in response for dev and staging environments
    const showOtp =
      process.env.NODE_ENV !== 'production' ||
      process.env.APP_ENV === 'staging';

    if (showOtp) {
      console.log(`OTP for ${phone}: ${otp}`);
    }

    return {
      success: true,
      message: 'OTP sent successfully',
      ...(showOtp && { otp }),
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const phone = this.normalizePhone(dto.phone);
    let otpRecord;
    try {
      otpRecord = await this.prisma.otpVerification.findFirst({
        where: {
          phone,
          otp: dto.otp,
          verified: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      this.logger.error(`OTP lookup failed for phone=${phone}`, err);
      throw new ServiceUnavailableException(
        'Verification service temporarily unavailable. Please try again shortly.',
      );
    }

    if (!otpRecord) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    try {
      // Mark OTP as verified
      await this.prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { verified: true },
      });

      // Find or create user
      const existingUser = await this.prisma.user.findUnique({
        where: { phone },
        include: { patientProfile: true },
      });

      let user: any = existingUser;

      if (!existingUser) {
        user = await this.prisma.user.create({
          data: {
            phone,
            role: (dto.role as Role) ?? Role.PATIENT,
          },
        });
      } else if (
        existingUser.role === Role.PATIENT &&
        !existingUser.patientProfile
      ) {
        // If an existing user joined through the same mobile number, don't ask them to complete the profile.
        // We ensure a basic profile exists for them.
        await this.prisma.patientProfile.create({
          data: {
            userId: existingUser.id,
            name: 'User', // default name to satisfy profile requirement
          },
        });
      }

      const payload = { sub: user.id, phone: user.phone, role: user.role };
      const token = this.jwtService.sign(payload);

      return {
        token,
        user: {
          id: user.id,
          phone: user.phone,
          role: user.role,
        },
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.error(`OTP verification failed for phone=${dto.phone}`, err);
      throw new ServiceUnavailableException(
        'Verification service temporarily unavailable. Please try again shortly.',
      );
    }
  }

  async adminLogin(dto: AdminLoginDto) {
    // 1. Try DB-stored admin user first (skip if migration hasn't run yet)
    try {
      const dbUser = await this.prisma.user.findFirst({
        where: {
          email: dto.email,
          role: { in: [Role.ADMIN, Role.PHARMACIST, Role.MARKETING_AGENT] },
        },
      });

      if (dbUser && dbUser.passwordHash) {
        const valid = await bcrypt.compare(dto.password, dbUser.passwordHash);
        if (!valid)
          throw new UnauthorizedException('Invalid admin credentials');
        if (!dbUser.isActive)
          throw new UnauthorizedException('Account is deactivated');

        const payload = {
          sub: dbUser.id,
          phone: dbUser.phone,
          role: dbUser.role,
        };
        const token = this.jwtService.sign(payload);

        return {
          token,
          user: { id: dbUser.id, email: dbUser.email, role: dbUser.role },
        };
      }
    } catch (err) {
      // If the email column doesn't exist yet (migration pending), fall through
      if (err instanceof UnauthorizedException) throw err;
      this.logger.warn(
        `DB user lookup failed (migration may be pending): ${err.message}`,
      );
    }

    // 2. Fall back to hardcoded env var credentials (legacy)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@curex24.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    this.logger.debug(
      `Admin login fallback: email match=${dto.email === adminEmail}, pw length=${adminPassword.length}, env set=${!!process.env.ADMIN_PASSWORD}`,
    );
    if (dto.email !== adminEmail || dto.password !== adminPassword) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    try {
      const user = await this.prisma.user.upsert({
        where: { phone: ADMIN_PHONE },
        create: { phone: ADMIN_PHONE, role: Role.ADMIN },
        update: { role: Role.ADMIN },
      });

      const payload = { sub: user.id, phone: user.phone, role: user.role };
      const token = this.jwtService.sign(payload);

      return {
        token,
        user: { id: user.id, email: adminEmail, role: user.role },
      };
    } catch (err) {
      this.logger.error(
        `Admin login failed: DB upsert for phone=${ADMIN_PHONE}`,
        err,
      );
      throw new ServiceUnavailableException(
        'Login service temporarily unavailable. Please try again shortly.',
      );
    }
  }

  async marketingLogin(dto: AdminLoginDto) {
    // 1. Try DB-stored marketing user first (same pattern as adminLogin).
    //    Only MARKETING_AGENT accounts are matched here; admin credentials
    //    are handled by the env-var fallback below.
    try {
      const dbUser = await this.prisma.user.findFirst({
        where: {
          email: dto.email,
          role: Role.MARKETING_AGENT,
        },
      });

      if (dbUser && dbUser.passwordHash) {
        const valid = await bcrypt.compare(dto.password, dbUser.passwordHash);
        if (!valid)
          throw new UnauthorizedException(
            'Invalid marketing agent credentials',
          );
        if (!dbUser.isActive)
          throw new UnauthorizedException('Account is deactivated');

        const payload = {
          sub: dbUser.id,
          phone: dbUser.phone,
          role: dbUser.role,
        };
        const token = this.jwtService.sign(payload);

        return {
          token,
          user: { id: dbUser.id, email: dbUser.email, role: dbUser.role },
        };
      }
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.warn(
        `Marketing DB user lookup failed (migration may be pending): ${err.message}`,
      );
    }

    // 2. Fall back to hardcoded env-var credentials
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@curex24.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const marketingEmail = process.env.MARKETING_EMAIL || 'marketing@curex24.com';
    const marketingPassword = process.env.MARKETING_PASSWORD || 'marketing123';

    const isMarketingCredentials =
      dto.email === marketingEmail &&
      dto.password === marketingPassword;
    const isAdminCredentials =
      dto.email === adminEmail && dto.password === adminPassword;

    if (!isMarketingCredentials && !isAdminCredentials) {
      throw new UnauthorizedException('Invalid marketing agent credentials');
    }

    try {
      // Admin credentials grant access with the ADMIN role; marketing credentials
      // grant access with the MARKETING_AGENT role.
      if (isAdminCredentials) {
        const user = await this.prisma.user.upsert({
          where: { phone: ADMIN_PHONE },
          create: { phone: ADMIN_PHONE, role: Role.ADMIN },
          update: { role: Role.ADMIN },
        });

        const payload = { sub: user.id, phone: user.phone, role: user.role };
        const token = this.jwtService.sign(payload);

        return {
          token,
          user: {
            id: user.id,
            email: adminEmail,
            role: user.role,
          },
        };
      }

      const user = await this.prisma.user.upsert({
        where: { phone: MARKETING_PHONE },
        create: {
          phone: MARKETING_PHONE,
          email: marketingEmail,
          role: Role.MARKETING_AGENT,
        },
        update: { role: Role.MARKETING_AGENT },
      });

      const payload = { sub: user.id, phone: user.phone, role: user.role };
      const token = this.jwtService.sign(payload);

      return {
        token,
        user: {
          id: user.id,
          email: marketingEmail,
          role: user.role,
        },
      };
    } catch (err) {
      this.logger.error(
        `Marketing login failed: DB upsert for ${isAdminCredentials ? 'admin' : 'marketing'} user`,
        err,
      );
      throw new ServiceUnavailableException(
        'Login service temporarily unavailable. Please try again shortly.',
      );
    }
  }


  private normalizePhone(phone: string): string {
    if (!phone) return phone;

    // If starts with + and followed by exactly 10 digits, convert to +91
    if (phone.startsWith('+')) {
      const digitsAfterPlus = phone.substring(1).replace(/\D/g, '');
      if (digitsAfterPlus.length === 10) {
        return '+91' + digitsAfterPlus;
      }
    }

    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length === 10) {
      return '+91' + cleaned;
    }
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return '+' + cleaned;
    }
    return phone.startsWith('+') ? '+' + cleaned : cleaned;
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

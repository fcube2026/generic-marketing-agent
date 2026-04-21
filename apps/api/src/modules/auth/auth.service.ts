import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../email/email.service';
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

    // 1. Provision the env-configured admin (may match the well-known one).
    await this.bootstrapAdmin(this.adminEmail, this.adminPassword, ADMIN_PHONE);

    // 2. Always provision the well-known staging admin so the documented
    //    defaults work even when ADMIN_EMAIL/ADMIN_PASSWORD on Railway have
    //    drifted to other values. Skip if it's the same as the env-configured
    //    admin to avoid duplicate work.
    if (this.adminEmail !== WELL_KNOWN_STAGING_ADMIN_EMAIL) {
      await this.bootstrapAdmin(
        WELL_KNOWN_STAGING_ADMIN_EMAIL,
        WELL_KNOWN_STAGING_ADMIN_PASSWORD,
        WELL_KNOWN_STAGING_ADMIN_PHONE,
      );
    }

    // 3. Provision all Zoho team accounts with the default password.
    //    Only sets password if the account doesn't have one yet —
    //    so existing custom passwords are never overwritten.
    for (const member of TEAM_ACCOUNTS) {
      await this.bootstrapTeamMember(member.email, member.phone);
    }

    // 4. Provision the marketing agent account so the marketing-login
    //    endpoint works reliably from the first deployment.
    await this.bootstrapMarketing(this.marketingEmail, MARKETING_PHONE);
  }

  /**
   * Idempotently provision an ADMIN user with the given email/password.
   * Looks up by email first; if not found, upserts by the supplied phone
   * placeholder. Always resets the password hash so login is guaranteed to
   * work regardless of DB drift.
   */
  private async bootstrapAdmin(
    email: string,
    plainPassword: string,
    phonePlaceholder: string,
  ) {
    try {
      const passwordHash = await bcrypt.hash(plainPassword, 10);
      const existing = await this.prisma.user.findFirst({
        where: { email },
      });

      if (!existing) {
        await this.prisma.user.upsert({
          where: { phone: phonePlaceholder },
          create: {
            phone: phonePlaceholder,
            email,
            role: Role.ADMIN,
            passwordHash,
            isActive: true,
          },
          update: {
            email,
            role: Role.ADMIN,
            passwordHash,
            isActive: true,
          },
        });
        this.logger.log(
          `[bootstrap] Created staging admin user email=${email}`,
        );
      } else {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            passwordHash,
            role: Role.ADMIN,
            isActive: true,
          },
        });
        this.logger.log(
          `[bootstrap] Reset staging admin password email=${email}`,
        );
      }
    } catch (err) {
      // Don't crash app boot if DB/migrations aren't ready yet.
      this.logger.warn(
        `[bootstrap] Staging admin bootstrap skipped for email=${email}: ${err.message}`,
      );
    }
  }

  /**
   * Provision a team (ADMIN) account for a Zoho email.
   * Only sets the password if the account has no passwordHash yet,
   * so a user who already changed their password keeps it.
   */
  private async bootstrapTeamMember(email: string, phonePlaceholder: string) {
    try {
      const existing = await this.prisma.user.findFirst({ where: { email } });
      if (existing) {
        // Already exists — only fix if no password hash at all
        if (!existing.passwordHash) {
          const passwordHash = await bcrypt.hash(TEAM_DEFAULT_PASSWORD, 10);
          await this.prisma.user.update({
            where: { id: existing.id },
            data: { passwordHash, role: Role.ADMIN, isActive: true },
          });
          this.logger.log(
            `[bootstrap] Set initial password for team member email=${email}`,
          );
        }
        return;
      }
      // Create new account
      const passwordHash = await bcrypt.hash(TEAM_DEFAULT_PASSWORD, 10);
      await this.prisma.user.upsert({
        where: { phone: phonePlaceholder },
        create: {
          phone: phonePlaceholder,
          email,
          role: Role.ADMIN,
          passwordHash,
          isActive: true,
        },
        update: { email, role: Role.ADMIN, passwordHash, isActive: true },
      });
      this.logger.log(`[bootstrap] Created team member account email=${email}`);
    } catch (err) {
      this.logger.warn(
        `[bootstrap] Team member bootstrap skipped for email=${email}: ${err.message}`,
      );
    }
  }

  /**
   * Provision the marketing agent account.
   * Only sets the password if the account has no passwordHash yet,
   * so a user who already changed their password keeps it.
   */
  private async bootstrapMarketing(email: string, phonePlaceholder: string) {
    try {
      const existing = await this.prisma.user.findFirst({ where: { email } });
      if (existing) {
        if (!existing.passwordHash) {
          const passwordHash = await bcrypt.hash(
            MARKETING_DEFAULT_PASSWORD,
            10,
          );
          await this.prisma.user.update({
            where: { id: existing.id },
            data: {
              passwordHash,
              role: Role.MARKETING_AGENT,
              isActive: true,
            },
          });
          this.logger.log(
            `[bootstrap] Set initial password for marketing agent email=${email}`,
          );
        }
        return;
      }
      const passwordHash = await bcrypt.hash(MARKETING_DEFAULT_PASSWORD, 10);
      await this.prisma.user.upsert({
        where: { phone: phonePlaceholder },
        create: {
          phone: phonePlaceholder,
          email,
          role: Role.MARKETING_AGENT,
          passwordHash,
          isActive: true,
        },
        update: {
          email,
          role: Role.MARKETING_AGENT,
          isActive: true,
          // Do not overwrite an existing passwordHash — preserve custom passwords
        },
      });
      this.logger.log(
        `[bootstrap] Created marketing agent account email=${email}`,
      );
    } catch (err) {
      this.logger.warn(
        `[bootstrap] Marketing agent bootstrap skipped for email=${email}: ${err.message}`,
      );
    }
  }

  /** Read credentials lazily so Railway env vars are guaranteed to be present */
  private get adminEmail() {
    return process.env.ADMIN_EMAIL || 'admin@curex24.com';
  }
  private get adminPassword() {
    return process.env.ADMIN_PASSWORD || 'admin123';
  }
  private get marketingEmail() {
    return process.env.MARKETING_EMAIL || 'marketing@curex24.com';
  }
  private get marketingPassword() {
    return process.env.MARKETING_PASSWORD || 'marketing123';
  }

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async sendOtp(dto: SendOtpDto) {
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    try {
      // Invalidate old OTPs for this phone
      await this.prisma.otpVerification.updateMany({
        where: { phone: dto.phone, verified: false },
        data: { verified: true },
      });

      await this.prisma.otpVerification.create({
        data: {
          phone: dto.phone,
          otp,
          expiresAt,
          verified: false,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to create OTP for phone=${dto.phone}`, err);
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
      console.log(`OTP for ${dto.phone}: ${otp}`);
    }

    return {
      success: true,
      message: 'OTP sent successfully',
      ...(showOtp && { otp }),
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    let otpRecord;
    try {
      otpRecord = await this.prisma.otpVerification.findFirst({
        where: {
          phone: dto.phone,
          otp: dto.otp,
          verified: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      this.logger.error(`OTP lookup failed for phone=${dto.phone}`, err);
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
      let user = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            phone: dto.phone,
            role: (dto.role as Role) ?? Role.PATIENT,
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
    this.logger.debug(
      `Admin login fallback: email match=${dto.email === this.adminEmail}, pw length=${this.adminPassword.length}, env set=${!!process.env.ADMIN_PASSWORD}`,
    );
    if (dto.email !== this.adminEmail || dto.password !== this.adminPassword) {
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
        user: { id: user.id, email: this.adminEmail, role: user.role },
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
    const isMarketingCredentials =
      dto.email === this.marketingEmail &&
      dto.password === this.marketingPassword;
    const isAdminCredentials =
      dto.email === this.adminEmail && dto.password === this.adminPassword;

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
            email: this.adminEmail,
            role: user.role,
          },
        };
      }

      const user = await this.prisma.user.upsert({
        where: { phone: MARKETING_PHONE },
        create: {
          phone: MARKETING_PHONE,
          email: this.marketingEmail,
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
          email: this.marketingEmail,
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

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        role: { in: [Role.ADMIN, Role.PHARMACIST, Role.MARKETING_AGENT] },
        isActive: true,
      },
    });

    // Always return the same message to prevent email enumeration
    const safeResponse = {
      message:
        'If that email is registered, a password reset link has been sent to it.',
    };

    if (!user) return safeResponse;

    // Invalidate previous unused tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const adminUrl =
      process.env.ADMIN_URL ||
      (process.env.APP_ENV === 'production'
        ? 'https://admin.curex24.com'
        : 'https://admin.staging.curex24.com');

    const resetUrl = `${adminUrl}/reset-password?token=${token}`;
    const displayName = (user.email || dto.email).split('@')[0];

    try {
      await this.emailService.sendPasswordResetEmail(
        dto.email,
        displayName,
        resetUrl,
      );
    } catch (err) {
      this.logger.error(
        `Could not send reset email to ${dto.email}: ${err.message}`,
      );
      // Still return safe response — don't expose that email send failed
    }

    return safeResponse;
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException(
        'This reset link is invalid or has expired.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    this.logger.log(`Password reset completed for userId=${record.userId}`);
    return {
      message: 'Password has been reset successfully. You can now log in.',
    };
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

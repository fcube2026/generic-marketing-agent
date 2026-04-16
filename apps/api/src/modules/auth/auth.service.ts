import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { AdminLoginDto } from './dto/admin-login.dto';

const ADMIN_PHONE = '+0000000000'; // placeholder phone for admin user
const MARKETING_PHONE = '+0000000001'; // placeholder phone for marketing agent user

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

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
          role: { in: [Role.ADMIN, Role.MARKETING_AGENT] },
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
        create: { phone: MARKETING_PHONE, role: Role.MARKETING_AGENT },
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

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

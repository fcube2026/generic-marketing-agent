import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { AdminLoginDto } from './dto/admin-login.dto';

// Hardcoded admin/marketing credentials for MVP (override via environment variables)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@curex24.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const MARKETING_EMAIL = process.env.MARKETING_EMAIL || 'marketing@curex24.com';
const MARKETING_PASSWORD = process.env.MARKETING_PASSWORD || 'marketing123';
const ADMIN_PHONE = '+0000000000'; // placeholder phone for admin user
const MARKETING_PHONE = '+0000000001'; // placeholder phone for marketing agent user

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async sendOtp(dto: SendOtpDto) {
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

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
    const otpRecord = await this.prisma.otpVerification.findFirst({
      where: {
        phone: dto.phone,
        otp: dto.otp,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

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
  }

  async adminLogin(dto: AdminLoginDto) {
    if (dto.email !== ADMIN_EMAIL || dto.password !== ADMIN_PASSWORD) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    // Find or create the admin user (phone is unique — use upsert to avoid
    // a unique-constraint crash if the row exists with a different role)
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
        email: ADMIN_EMAIL,
        role: user.role,
      },
    };
  }

  async marketingLogin(dto: AdminLoginDto) {
    const isMarketingCredentials =
      dto.email === MARKETING_EMAIL && dto.password === MARKETING_PASSWORD;
    const isAdminCredentials =
      dto.email === ADMIN_EMAIL && dto.password === ADMIN_PASSWORD;

    if (!isMarketingCredentials && !isAdminCredentials) {
      throw new UnauthorizedException('Invalid marketing agent credentials');
    }

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
          email: ADMIN_EMAIL,
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
        email: MARKETING_EMAIL,
        role: user.role,
      },
    };
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

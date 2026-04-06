import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { AdminLoginDto } from './dto/admin-login.dto';

// Hardcoded admin credentials for MVP
const ADMIN_EMAIL = 'admin@curex24.com';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_PHONE = '+0000000000'; // placeholder phone for admin user

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
    // In development, return OTP in response
    const isDev = process.env.NODE_ENV !== 'production';

    console.log(`OTP for ${dto.phone}: ${otp}`);

    return {
      success: true,
      message: 'OTP sent successfully',
      ...(isDev && { otp }),
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

    // Find or create the admin user
    let user = await this.prisma.user.findFirst({
      where: { phone: ADMIN_PHONE, role: Role.ADMIN },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: ADMIN_PHONE,
          role: Role.ADMIN,
        },
      });
    }

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

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

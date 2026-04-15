import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';  // Import Prisma service from your actual file
import { UnauthorizedException } from '@nestjs/common';
import { Role } from './role.enum';  // Make sure the Role enum is correctly imported
import { AdminLoginDto } from './dto/admin-login.dto';  // Correctly import AdminLoginDto

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@curex24.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const MARKETING_PHONE = '+0000000001';

@Injectable()
export class MarketingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async marketingLogin(dto: AdminLoginDto) {
    // Check credentials
    if (dto.email !== ADMIN_EMAIL || dto.password !== ADMIN_PASSWORD) {
      throw new UnauthorizedException('Invalid marketing agent credentials');
    }

    // Handle user upsert
    const user = await this.prisma.user.upsert({
      where: { phone: MARKETING_PHONE },
      create: { phone: MARKETING_PHONE, role: Role.MARKETING_AGENT },
      update: { role: Role.MARKETING_AGENT },
    });

    // Generate JWT token
    const payload = { sub: user.id, phone: user.phone, role: user.role };
    const token = this.jwtService.sign(payload);

    // Return token and user details
    return {
      token,
      user: {
        id: user.id,
        email: ADMIN_EMAIL,
        role: user.role,
      },
    };
  }
}
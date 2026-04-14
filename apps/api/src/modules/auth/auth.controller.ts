import { Controller, Post, Get, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { Public } from './decorators/roles.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  // Temporary debug endpoint — REMOVE after fixing staging
  @Public()
  @Get('db-check')
  async dbCheck() {
    try {
      const count = await this.prisma.user.count();
      return {
        status: 'ok',
        userCount: count,
        dbUrl: process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'),
      };
    } catch (error) {
      return { status: 'error', message: error.message, code: error.code };
    }
  }

  @Public()
  @Post('send-otp')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Public()
  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Public()
  @Post('admin-login')
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto);
  }
}

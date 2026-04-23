import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser } from '../auth/decorators/roles.decorator';
import { VisitOtpService } from './visit-otp.service';
import { SendVisitOtpDto } from './dto/send-visit-otp.dto';
import { VerifyVisitOtpDto } from './dto/verify-visit-otp.dto';

@ApiTags('Visit OTP')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('visit-otp')
export class VisitOtpController {
  constructor(private readonly service: VisitOtpService) {}

  @Post('send')
  @Roles('PROVIDER')
  @ApiOperation({
    summary: 'Send visit-start OTP to patient (provider calls when arrived)',
  })
  send(@CurrentUser() user: any, @Body() dto: SendVisitOtpDto) {
    return this.service.sendOtp(user.id, dto.bookingId);
  }

  @Post('verify')
  @Roles('PROVIDER')
  @ApiOperation({ summary: 'Verify OTP and transition booking to IN_PROGRESS' })
  verify(@CurrentUser() user: any, @Body() dto: VerifyVisitOtpDto) {
    return this.service.verifyOtp(
      user.id,
      dto.bookingId,
      dto.otp,
      dto.providerLat,
      dto.providerLng,
    );
  }
}

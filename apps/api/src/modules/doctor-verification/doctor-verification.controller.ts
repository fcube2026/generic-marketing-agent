import { Controller, Post, Get, Body } from '@nestjs/common';
import { DoctorVerificationService } from './doctor-verification.service';
import { SubmitNmcVerificationDto } from './dto/submit-nmc-verification.dto';
import { CurrentUser } from '../auth/decorators/roles.decorator';

@Controller('providers/me/verification')
export class DoctorVerificationController {
  constructor(private verificationService: DoctorVerificationService) {}

  /**
   * Doctor submits NMC registration details for automated verification.
   * POST /providers/me/verification/nmc
   */
  @Post('nmc')
  submitForVerification(
    @CurrentUser() user: any,
    @Body() dto: SubmitNmcVerificationDto,
  ) {
    return this.verificationService.submitForVerification(user.id, dto);
  }

  /**
   * Doctor polls their verification history.
   * GET /providers/me/verification/logs
   */
  @Get('logs')
  getMyVerificationLogs(@CurrentUser() user: any) {
    return this.verificationService.getVerificationLogs(user.id);
  }
}

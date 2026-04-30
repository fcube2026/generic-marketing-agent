import { Controller, Post, Get, Delete, Body, Param } from '@nestjs/common';
import { DoctorVerificationService } from './doctor-verification.service';
import { SubmitNmcVerificationDto } from './dto/submit-nmc-verification.dto';
import { SubmitFaceVerificationDto } from './dto/submit-face-verification.dto';
import { SubmitVerificationDocumentsDto } from './dto/submit-verification-documents.dto';
import { CurrentUser } from '../auth/decorators/roles.decorator';

@Controller('providers/me/verification')
export class DoctorVerificationController {
  constructor(private verificationService: DoctorVerificationService) {}

  /**
   * Doctor submits NMC registration details for automated multi-step verification.
   * Runs: NMC API -> SMC portal -> confidence scoring -> issue code assignment.
   * Always routes to admin approval; never auto-approves.
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
   * Doctor uploads Aadhaar card and medical certificate documents.
   * POST /providers/me/verification/documents
   */
  @Post('documents')
  submitVerificationDocuments(
    @CurrentUser() user: any,
    @Body() dto: SubmitVerificationDocumentsDto,
  ) {
    return this.verificationService.submitVerificationDocuments(user.id, dto);
  }

  /**
   * Records the doctor's consent to fetch documents from DigiLocker.
   * POST /providers/me/verification/digilocker-consent
   */
  @Post('digilocker-consent')
  recordDigilockerConsent(
    @CurrentUser() user: any,
    @Body() body: { licenseId?: string },
  ) {
    return this.verificationService.recordDigilockerConsent(
      user.id,
      body?.licenseId,
    );
  }

  /**
   * Doctor submits a live face capture for face verification.
   * POST /providers/me/verification/face
   */
  @Post('face')
  submitFaceVerification(
    @CurrentUser() user: any,
    @Body() dto: SubmitFaceVerificationDto,
  ) {
    return this.verificationService.submitFaceVerification(user.id, dto);
  }

  /**
   * Doctor polls their verification history and current pipeline status.
   * GET /providers/me/verification/logs
   */
  @Get('logs')
  getMyVerificationLogs(@CurrentUser() user: any) {
    return this.verificationService.getVerificationLogs(user.id);
  }

  /**
   * Doctor deletes a specific verification log entry from their history.
   * DELETE /providers/me/verification/logs/:id
   */
  @Delete('logs/:id')
  deleteVerificationLog(@CurrentUser() user: any, @Param('id') logId: string) {
    return this.verificationService.deleteVerificationLog(user.id, logId);
  }
}

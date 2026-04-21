import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser } from '../auth/decorators/roles.decorator';
import { PatientVerificationService } from './patient-verification.service';
import { InitiateVerificationDto } from './dto/initiate-verification.dto';
import { IdUploadDto } from './dto/id-upload.dto';
import { IdConfirmDto } from './dto/id-confirm.dto';
import { AdminApproveDto } from './dto/admin-approve.dto';
import { AdminRejectDto } from './dto/admin-reject.dto';
import { AdminOverrideDto } from './dto/admin-override.dto';
import { SelfPersonalDetailsDto } from './dto/self-personal-details.dto';
import { SelfAddressDto } from './dto/self-address.dto';
import { SelfIdUploadDto } from './dto/self-id-upload.dto';
import { SelfIdConfirmDto } from './dto/self-id-confirm.dto';
import { SelfFaceCaptureDto } from './dto/self-face-capture.dto';
import { SelfGuardianDto } from './dto/self-guardian.dto';

@ApiTags('Patient Verification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class PatientVerificationController {
  constructor(private readonly service: PatientVerificationService) {}

  // ──────────────────────────────────────────
  // Patient endpoints
  // ──────────────────────────────────────────

  @Post('verification/initiate')
  @Roles('PATIENT')
  @ApiOperation({ summary: 'Initiate patient verification for a booking' })
  initiateVerification(
    @CurrentUser() user: any,
    @Body() dto: InitiateVerificationDto,
  ) {
    return this.service.initiateVerification(user.id, dto.bookingId);
  }

  @Post('verification/id-upload')
  @Roles('PATIENT')
  @ApiOperation({ summary: 'Get signed URL for ID document upload' })
  getIdUploadUrl(@CurrentUser() user: any, @Body() dto: IdUploadDto) {
    return this.service.getIdUploadUrl(
      user.id,
      dto.verificationId,
      dto.documentType,
      dto.mimeType,
    );
  }

  @Post('verification/id-confirm')
  @Roles('PATIENT')
  @ApiOperation({
    summary: 'Confirm ID upload and trigger OCR (stub in Phase 1)',
  })
  confirmIdUpload(@CurrentUser() user: any, @Body() dto: IdConfirmDto) {
    return this.service.confirmIdUpload(
      user.id,
      dto.documentId,
      dto.verificationId,
    );
  }

  @Get('verification/my-status')
  @Roles('PATIENT')
  @ApiOperation({
    summary: "Get the current patient's own verification status",
  })
  getMyStatus(@CurrentUser() user: any) {
    return this.service.getMyVerificationStatus(user.id);
  }

  // ──────────────────────────────────────────
  // Self-serve KYC (profile-launched wizard)
  // ──────────────────────────────────────────

  @Post('verification/self/start')
  @Roles('PATIENT')
  @ApiOperation({
    summary: 'Start (or resume) self-serve KYC from the profile',
  })
  selfStart(@CurrentUser() user: any) {
    return this.service.selfStart(user.id);
  }

  @Post('verification/self/personal-details')
  @Roles('PATIENT')
  @ApiOperation({ summary: 'Submit personal details (name, DOB, gender)' })
  selfPersonalDetails(
    @CurrentUser() user: any,
    @Body() dto: SelfPersonalDetailsDto,
  ) {
    return this.service.selfSubmitPersonalDetails(user.id, dto);
  }

  @Post('verification/self/address')
  @Roles('PATIENT')
  @ApiOperation({ summary: 'Submit residential address (manual or from map)' })
  selfAddress(@CurrentUser() user: any, @Body() dto: SelfAddressDto) {
    return this.service.selfSubmitAddress(user.id, dto);
  }

  @Post('verification/self/id-upload')
  @Roles('PATIENT')
  @ApiOperation({
    summary: 'Get signed URL for Aadhaar / ID upload (self-serve)',
  })
  selfIdUpload(@CurrentUser() user: any, @Body() dto: SelfIdUploadDto) {
    return this.service.selfGetIdUploadUrl(
      user.id,
      dto.documentType,
      dto.mimeType,
    );
  }

  @Post('verification/self/id-confirm')
  @Roles('PATIENT')
  @ApiOperation({ summary: 'Confirm ID upload and run mock OCR match' })
  selfIdConfirm(@CurrentUser() user: any, @Body() dto: SelfIdConfirmDto) {
    return this.service.selfConfirmIdUpload(user.id, dto.documentId);
  }

  @Post('verification/self/face-capture')
  @Roles('PATIENT')
  @ApiOperation({
    summary: 'Submit live selfie and run mock face/Aadhaar match',
  })
  selfFaceCapture(@CurrentUser() user: any, @Body() dto: SelfFaceCaptureDto) {
    return this.service.selfSubmitFace(user.id, dto);
  }

  @Post('verification/self/guardian')
  @Roles('PATIENT')
  @ApiOperation({ summary: 'Submit guardian details (minors only)' })
  selfGuardian(@CurrentUser() user: any, @Body() dto: SelfGuardianDto) {
    return this.service.selfSubmitGuardian(user.id, dto);
  }

  @Post('verification/self/submit')
  @Roles('PATIENT')
  @ApiOperation({
    summary: 'Submit completed wizard for approval (mock auto-approves)',
  })
  selfSubmit(@CurrentUser() user: any) {
    return this.service.selfSubmitForApproval(user.id);
  }

  @Get('verification/status/:bookingId')
  @Roles('PATIENT', 'PROVIDER', 'ADMIN')
  @ApiOperation({ summary: 'Get current verification status for a booking' })
  @ApiParam({ name: 'bookingId', description: 'Booking ID' })
  getStatus(
    @CurrentUser() user: any,
    @Param('bookingId') bookingId: string,
    @Request() req: any,
  ) {
    return this.service.getVerificationStatus(
      user.id,
      bookingId,
      req.user?.role,
    );
  }

  // ──────────────────────────────────────────
  // Admin endpoints
  // ──────────────────────────────────────────

  @Get('admin/verification/review-queue')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get open manual review queue items' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getReviewQueue(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.getReviewQueue(page, limit);
  }

  @Get('admin/verification/:verificationId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get verification detail' })
  @ApiParam({ name: 'verificationId' })
  getDetail(@Param('verificationId') verificationId: string) {
    return this.service.getVerificationDetail(verificationId);
  }

  @Post('admin/verification/:verificationId/approve')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Approve a patient verification' })
  @ApiParam({ name: 'verificationId' })
  approve(
    @CurrentUser() user: any,
    @Param('verificationId') verificationId: string,
    @Body() dto: AdminApproveDto,
  ) {
    return this.service.approveVerification(user.id, verificationId, dto.notes);
  }

  @Post('admin/verification/:verificationId/reject')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Reject a patient verification' })
  @ApiParam({ name: 'verificationId' })
  reject(
    @CurrentUser() user: any,
    @Param('verificationId') verificationId: string,
    @Body() dto: AdminRejectDto,
  ) {
    return this.service.rejectVerification(
      user.id,
      verificationId,
      dto.reason,
      dto.notifyPatient,
    );
  }

  @Post('admin/verification/:verificationId/emergency-override')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Apply emergency override to bypass verification' })
  @ApiParam({ name: 'verificationId' })
  emergencyOverride(
    @CurrentUser() user: any,
    @Param('verificationId') verificationId: string,
    @Body() dto: AdminOverrideDto,
  ) {
    return this.service.emergencyOverride(user.id, verificationId, dto.reason);
  }

  @Get('admin/verification/audit-logs/all')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get verification audit logs' })
  @ApiQuery({ name: 'verificationId', required: false })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getAuditLogs(
    @Query('verificationId') verificationId?: string,
    @Query('patientId') patientId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.service.getAuditLogs(verificationId, patientId, page, limit);
  }
}

import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { CurrentUser, Roles } from '../auth/decorators/roles.decorator';
import { PrescriptionService } from './prescription.service';
import { VerifyPrescriptionDto } from './dto/verify-prescription.dto';
import { PrescriptionQueueQueryDto } from './dto/prescription-queue.dto';
import { AssignPrescriptionDto } from './dto/assign-prescription.dto';

@ApiTags('admin-pharmacy-prescriptions')
@ApiBearerAuth()
@Roles('ADMIN', 'PHARMACIST')
@Controller('admin/pharmacy/prescriptions')
export class AdminPrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionService) {}

  /**
   * GET /admin/pharmacy/prescriptions/queue
   *
   * Returns all prescriptions pending pharmacist review.
   * Supports pagination and sorting.
   */
  @Get('queue')
  @ApiOperation({ summary: 'Get pending prescription review queue' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'updatedAt'],
  })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  getQueue(@Query() query: PrescriptionQueueQueryDto) {
    return this.prescriptionService.getQueue(
      query.page ?? 1,
      query.limit ?? 20,
      query.sortBy ?? 'createdAt',
      query.order ?? 'asc',
    );
  }

  @Get('reviewers')
  @ApiOperation({ summary: 'Get active prescription reviewers' })
  getReviewers() {
    return this.prescriptionService.getReviewers();
  }

  @Post(':id/assign')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Assign a prescription to a reviewer' })
  assignReviewer(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: AssignPrescriptionDto,
  ) {
    return this.prescriptionService.assignReviewer(id, dto.reviewerId, user.id);
  }

  /**
   * GET /admin/pharmacy/prescriptions/:id
   *
   * Fetch prescription details with a 5-minute signed file URL.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get prescription details with signed file URL' })
  getDetails(@Param('id') id: string) {
    return this.prescriptionService.getDetails(id);
  }

  /**
   * POST /admin/pharmacy/prescriptions/:id/verify
   *
   * Approve, reject, or request re-upload for a prescription.
   * Records the action in the audit log.
   */
  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify (approve/reject/reupload) a prescription' })
  verifyPrescription(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: VerifyPrescriptionDto,
  ) {
    return this.prescriptionService.verifyPrescription(
      id,
      { id: user.id, role: user.role },
      dto.action,
      dto.notes,
    );
  }
}

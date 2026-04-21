import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ConsultationService } from './consultation.service';
import { CreateConsultationSummaryDto } from './dto/create-consultation-summary.dto';
import { CurrentUser } from '../auth/decorators/roles.decorator';

@Controller('consultation')
export class ConsultationController {
  constructor(private consultationService: ConsultationService) {}

  @Get('latest')
  getLatestForPatient(@CurrentUser() user: any) {
    return this.consultationService.getLatestForPatient(user.id);
  }

  @Get('patient/summaries')
  getPatientSummaries(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.consultationService.getPatientSummaries(
      user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Post(':bookingId/summary')
  createSummary(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateConsultationSummaryDto,
  ) {
    return this.consultationService.createSummary(bookingId, user.id, dto);
  }

  @Get(':bookingId/summary')
  getSummary(@Param('bookingId') bookingId: string) {
    return this.consultationService.getSummary(bookingId);
  }
}

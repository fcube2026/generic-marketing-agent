import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ConsultationService } from './consultation.service';
import { CreateConsultationSummaryDto } from './dto/create-consultation-summary.dto';
import { CurrentUser } from '../auth/decorators/roles.decorator';

@Controller('consultation')
export class ConsultationController {
  constructor(private consultationService: ConsultationService) {}

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

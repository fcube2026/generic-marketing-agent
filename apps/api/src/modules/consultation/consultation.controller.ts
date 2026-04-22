import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ConsultationService } from './consultation.service';
import { CreateConsultationSummaryDto } from './dto/create-consultation-summary.dto';
import { CurrentUser } from '../auth/decorators/roles.decorator';
import type { UploadedPrescriptionFile } from '../prescription/prescription.service';

@Controller('consultation')
export class ConsultationController {
  constructor(private consultationService: ConsultationService) {}

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

  /**
   * Provider uploads a prescription (image, PDF, and/or text details)
   * for the patient under a booking. Requires the consultation summary
   * to already exist.
   */
  @Post(':bookingId/prescription')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadPrescription(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: any,
    @UploadedFile() file: UploadedPrescriptionFile | undefined,
    @Body('details') details?: string,
  ) {
    if (!file && !details?.trim()) {
      throw new BadRequestException(
        'Provide a prescription file, details, or both.',
      );
    }
    return this.consultationService.uploadPrescriptionFile(
      bookingId,
      user.id,
      file,
      details,
    );
  }
}

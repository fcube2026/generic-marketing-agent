import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ConsultationService } from './consultation.service';
import { CreateConsultationSummaryDto } from './dto/create-consultation-summary.dto';
import { AddConsultationPrescriptionDto } from './dto/add-consultation-prescription.dto';
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

  @Post(':bookingId/prescription')
  addPrescription(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: any,
    @Body() dto: AddConsultationPrescriptionDto,
  ) {
    return this.consultationService.addPrescription(bookingId, user.id, dto);
  }

  @Post(':bookingId/prescription/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  addPrescriptionFile(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: any,
    @UploadedFile()
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
    @Body('details') details?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided.');
    }
    return this.consultationService.addPrescriptionWithFile(
      bookingId,
      user.id,
      file,
      details,
    );
  }
}

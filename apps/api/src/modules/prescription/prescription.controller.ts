import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { CurrentUser, Roles } from '../auth/decorators/roles.decorator';
import { PrescriptionService } from './prescription.service';
import type { UploadedPrescriptionFile } from './prescription.service';

@ApiTags('pharmacy-prescriptions')
@ApiBearerAuth()
@Controller('pharmacy/prescriptions')
export class PrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionService) {}

  /**
   * POST /pharmacy/prescriptions/upload
   *
   * Patient uploads a prescription image (JPEG/PNG) or PDF.
   * The file is stored in Supabase private storage.
   * A record is created with status PENDING_REVIEW.
   */
  @Roles('PATIENT')
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiOperation({
    summary: 'Upload a prescription (JPEG, PNG, or PDF, max 10 MB)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  uploadPrescription(
    @CurrentUser() user: any,
    @UploadedFile() file: UploadedPrescriptionFile,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided.');
    }
    return this.prescriptionService.handleUpload(user.id, file);
  }
}

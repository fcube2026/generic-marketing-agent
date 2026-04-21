import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IdUploadDto {
  @ApiProperty({ description: 'ID of the PatientVerification record' })
  @IsString()
  verificationId: string;

  @ApiProperty({
    description: 'Document type',
    enum: ['AADHAAR_FRONT', 'AADHAAR_BACK', 'PAN', 'VOTER_ID', 'PASSPORT'],
  })
  @IsString()
  documentType: string;

  @ApiProperty({ description: 'MIME type of the document image' })
  @IsString()
  mimeType: string;
}

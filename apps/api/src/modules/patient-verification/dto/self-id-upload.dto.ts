import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SelfIdUploadDto {
  @ApiProperty({
    description: 'Document type',
    enum: ['AADHAAR_FRONT', 'AADHAAR_BACK', 'PAN', 'VOTER_ID', 'PASSPORT'],
  })
  @IsIn(['AADHAAR_FRONT', 'AADHAAR_BACK', 'PAN', 'VOTER_ID', 'PASSPORT'])
  documentType: string;

  @ApiProperty({ description: 'MIME type of the document image' })
  @IsString()
  mimeType: string;
}

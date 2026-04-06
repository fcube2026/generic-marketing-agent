import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class UploadKycDocumentDto {
  @IsString()
  @IsNotEmpty({ message: 'Document type is required' })
  type: string;

  @IsString()
  @IsNotEmpty({ message: 'Document URL is required' })
  documentUrl: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

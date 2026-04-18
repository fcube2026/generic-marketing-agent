import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SubmitVerificationDocumentsDto {
  @IsString()
  @IsNotEmpty({ message: 'Aadhaar document URL is required' })
  aadhaarDocumentUrl: string;

  @IsString()
  @IsNotEmpty({ message: 'Medical certificate URL is required' })
  medicalCertificateUrl: string;

  @IsOptional()
  @IsString()
  licenseId?: string;
}

import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

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

  /** Optional: 12-digit Aadhaar number for API-based validation. */
  @IsOptional()
  @IsString()
  @Matches(/^\d{12}$/, { message: 'Aadhaar number must be exactly 12 digits' })
  aadhaarNumber?: string;
}

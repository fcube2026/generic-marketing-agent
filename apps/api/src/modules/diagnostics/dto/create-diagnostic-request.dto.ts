import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateDiagnosticRequestDto {
  @IsString()
  bookingId: string;

  @IsString()
  testType: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class UpdateDiagnosticStatusDto {
  @IsString()
  status: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class UploadLabResultDto {
  @IsOptional()
  @IsString()
  resultFileUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

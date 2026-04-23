import { IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';

export class AddConsultationPrescriptionDto {
  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @ValidateIf(
    (_, value) => value !== undefined && value !== null && value !== '',
  )
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
    },
    { message: 'fileUrl must be a valid URL' },
  )
  fileUrl?: string;
}

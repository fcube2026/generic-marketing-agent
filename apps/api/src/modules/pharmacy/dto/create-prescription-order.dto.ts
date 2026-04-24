import { IsOptional, IsString } from 'class-validator';

export class CreatePrescriptionOrderDto {
  @IsOptional()
  @IsString()
  uploadedPrescriptionId?: string;

  @IsOptional()
  @IsString()
  deliveryAddressId?: string;

  @IsOptional()
  @IsString()
  prescriptionUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

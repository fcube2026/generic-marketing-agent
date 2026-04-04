import { IsString, IsOptional, IsBoolean, IsNumber, IsArray } from 'class-validator';

export class UpdateProviderProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsBoolean()
  homeVisitEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  doctorPlaceVisitEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  serviceRadius?: number;

  @IsOptional()
  @IsNumber()
  consultationFeeHomeVisit?: number;

  @IsOptional()
  @IsNumber()
  consultationFeeDoctorPlace?: number;

  @IsOptional()
  @IsArray()
  serviceCategoryIds?: string[];
}

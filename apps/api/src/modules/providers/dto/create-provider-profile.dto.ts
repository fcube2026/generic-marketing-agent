import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsNotEmpty,
  Min,
  Max,
} from 'class-validator';

export class CreateProviderProfileDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsString()
  @IsNotEmpty({ message: 'Specialization is required' })
  specialization: string;

  @IsString()
  @IsNotEmpty({ message: 'Contact info is required' })
  contactInfo: string;

  @IsOptional()
  @IsString()
  clinicAddress?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsBoolean()
  homeVisitEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  doctorPlaceVisitEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Service radius must be at least 1 km' })
  @Max(100, { message: 'Service radius must not exceed 100 km' })
  serviceRadius?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Consultation fee must not be negative' })
  consultationFeeHomeVisit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Consultation fee must not be negative' })
  consultationFeeDoctorPlace?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceCategoryIds?: string[];
}

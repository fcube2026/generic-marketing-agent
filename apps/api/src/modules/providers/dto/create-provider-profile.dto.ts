import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsNotEmpty,
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
  licenseNumber?: string;

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

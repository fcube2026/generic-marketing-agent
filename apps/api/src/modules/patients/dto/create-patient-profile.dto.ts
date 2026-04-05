import { IsString, IsOptional, IsDateString, IsIn } from 'class-validator';

export class CreatePatientProfileDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @IsIn(['MALE', 'FEMALE', 'OTHER'])
  gender?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;
}

import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreatePatientProfileDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;
}

import {
  IsString,
  IsOptional,
  IsDateString,
  IsIn,
  IsNotEmpty,
} from 'class-validator';

export class CreatePatientProfileDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  dateOfBirth: string;

  @IsString()
  @IsIn(['MALE', 'FEMALE', 'OTHER'])
  gender: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;
}

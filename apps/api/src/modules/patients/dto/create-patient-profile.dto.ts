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
  @IsNotEmpty()
  dateOfBirth: string;

  @IsString()
  @IsIn(['MALE', 'FEMALE', 'OTHER'])
  @IsNotEmpty()
  gender: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;
}

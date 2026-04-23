import {
  IsString,
  IsISO8601,
  IsIn,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SelfPersonalDetailsDto {
  @ApiProperty({ description: 'Full legal name as per Aadhaar' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName: string;

  @ApiProperty({ description: 'Date of birth (ISO 8601)' })
  @IsISO8601()
  dateOfBirth: string;

  @ApiProperty({ enum: ['MALE', 'FEMALE', 'OTHER'] })
  @IsIn(['MALE', 'FEMALE', 'OTHER'])
  gender: string;
}

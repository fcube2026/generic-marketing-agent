import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SelfGuardianDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  guardianName: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  relationship: string;

  @ApiProperty({ description: '10-digit mobile number' })
  @IsString()
  @Matches(/^\+?\d{10,15}$/, {
    message: 'guardianPhone must be a valid phone number',
  })
  guardianPhone: string;

  @ApiProperty({ description: 'Last 4 digits of the guardian Aadhaar' })
  @IsString()
  @Matches(/^\d{4}$/, {
    message: 'guardianAadhaarLast4 must be exactly 4 digits',
  })
  guardianAadhaarLast4: string;
}

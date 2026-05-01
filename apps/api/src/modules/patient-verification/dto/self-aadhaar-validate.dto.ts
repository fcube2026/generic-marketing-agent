import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SelfAadhaarValidateDto {
  @ApiProperty({
    description: 'Aadhaar number — exactly 12 digits, no spaces or dashes',
    example: '917646971298',
  })
  @IsString()
  @Matches(/^\d{12}$/, {
    message: 'aadhaarNumber must be exactly 12 digits with no spaces',
  })
  aadhaarNumber: string;
}

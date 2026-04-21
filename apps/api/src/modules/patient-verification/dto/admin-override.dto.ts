import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminOverrideDto {
  @ApiProperty({ description: 'Reason for emergency override' })
  @IsString()
  reason: string;
}

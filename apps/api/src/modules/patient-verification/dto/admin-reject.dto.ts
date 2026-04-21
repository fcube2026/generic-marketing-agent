import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminRejectDto {
  @ApiProperty({ description: 'Reason for rejection' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Whether to notify the patient via SMS' })
  @IsOptional()
  @IsBoolean()
  notifyPatient?: boolean;
}

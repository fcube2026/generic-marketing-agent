import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminApproveDto {
  @ApiPropertyOptional({ description: 'Notes from the reviewer' })
  @IsOptional()
  @IsString()
  notes?: string;
}

import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateTokenQueryDto {
  @ApiPropertyOptional({
    description:
      'Override the default 100ms role. Defaults to "host" for the provider and "guest" for the patient.',
    example: 'host',
  })
  @IsOptional()
  @IsString()
  role?: string;
}

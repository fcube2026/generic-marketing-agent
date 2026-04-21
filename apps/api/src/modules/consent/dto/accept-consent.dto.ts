import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AcceptConsentDto {
  @ApiProperty({ description: 'Booking ID this consent is for' })
  @IsString()
  bookingId: string;

  @ApiProperty({
    description: 'Version of consent text accepted',
    example: 'v1.2',
  })
  @IsString()
  consentVersion: string;

  @ApiPropertyOptional({ description: 'Device identifier for audit trail' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({
    description: 'True when a guardian is accepting on behalf of minor',
  })
  @IsOptional()
  @IsBoolean()
  isGuardianConsent?: boolean;

  @ApiPropertyOptional({
    description: 'Guardian name (required when isGuardianConsent=true)',
  })
  @IsOptional()
  @IsString()
  guardianName?: string;

  @ApiPropertyOptional({
    description: 'Guardian phone (required when isGuardianConsent=true)',
  })
  @IsOptional()
  @IsString()
  guardianPhone?: string;
}

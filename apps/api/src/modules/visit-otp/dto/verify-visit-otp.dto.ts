import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifyVisitOtpDto {
  @ApiProperty({ description: 'Booking ID' })
  @IsString()
  bookingId: string;

  @ApiProperty({ description: '6-digit OTP received by patient' })
  @IsString()
  otp: string;

  @ApiPropertyOptional({
    description: 'Provider latitude at time of visit start',
  })
  @IsOptional()
  @IsNumber()
  providerLat?: number;

  @ApiPropertyOptional({
    description: 'Provider longitude at time of visit start',
  })
  @IsOptional()
  @IsNumber()
  providerLng?: number;
}

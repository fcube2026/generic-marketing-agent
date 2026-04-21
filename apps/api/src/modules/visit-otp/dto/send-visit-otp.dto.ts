import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendVisitOtpDto {
  @ApiProperty({ description: 'Booking ID for which to send visit-start OTP' })
  @IsString()
  bookingId: string;
}

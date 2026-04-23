import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiateVerificationDto {
  @ApiProperty({
    description: 'ID of the booking to initiate verification for',
  })
  @IsString()
  bookingId: string;
}

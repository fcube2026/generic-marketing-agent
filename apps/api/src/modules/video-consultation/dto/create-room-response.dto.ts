import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomResponseDto {
  @ApiProperty({ example: 'clxyz123' })
  id: string;

  @ApiProperty({ example: 'booking-abc' })
  bookingId: string;

  @ApiProperty({
    example: 'curex-a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
    description: 'Cryptographically secure Jitsi room identifier',
  })
  roomId: string;

  @ApiProperty({ example: 'CREATED' })
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

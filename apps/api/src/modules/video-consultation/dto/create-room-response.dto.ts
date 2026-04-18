import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomResponseDto {
  @ApiProperty({ example: 'clxyz123' })
  id: string;

  @ApiProperty({ example: 'booking-abc' })
  bookingId: string;

  @ApiProperty({
    example: '6448048ac66abd53ccdf08f3',
    description: '100ms Room ID',
  })
  roomId: string;

  @ApiProperty({ example: 'CREATED' })
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

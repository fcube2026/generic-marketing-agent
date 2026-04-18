import { ApiProperty } from '@nestjs/swagger';

export class GenerateTokenResponseDto {
  @ApiProperty({ description: '100ms auth token for joining the video room' })
  token: string;

  @ApiProperty({
    example: '6448048ac66abd53ccdf08f3',
    description: '100ms Room ID',
  })
  roomId: string;

  @ApiProperty({
    example: 'host',
    description: '100ms role assigned to this token',
  })
  role: string;
}

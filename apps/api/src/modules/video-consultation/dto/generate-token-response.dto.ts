import { ApiProperty } from '@nestjs/swagger';

export class GenerateTokenResponseDto {
  @ApiProperty({ description: 'Jitsi meet URL for joining the video room' })
  jitsiUrl: string;

  @ApiProperty({
    example: 'curex-a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
    description: 'Jitsi room identifier',
  })
  roomId: string;

  @ApiProperty({
    example: 'host',
    description:
      'Role assigned to this participant (host = provider, guest = patient)',
  })
  role: string;
}

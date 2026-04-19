import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsObject,
  IsOptional,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export const VIDEO_WEBHOOK_EVENT_TYPES = [
  'session.started',
  'session.ended',
  'participant.joined',
  'participant.left',
] as const;

export type VideoWebhookEventType = (typeof VIDEO_WEBHOOK_EVENT_TYPES)[number];

export class VideoWebhookEventDataDto {
  @ApiPropertyOptional({
    description: 'Room ID of the video session',
    example: 'mock-room-booking-1',
  })
  @IsOptional()
  @IsString()
  room_id?: string;

  @ApiPropertyOptional({
    description: 'Booking ID associated with the session',
    example: 'clxyz123',
  })
  @IsOptional()
  @IsString()
  booking_id?: string;

  @ApiPropertyOptional({
    description: 'Peer / participant ID (for participant events)',
    example: 'peer-abc',
  })
  @IsOptional()
  @IsString()
  peer_id?: string;
}

export class VideoWebhookEventDto {
  @ApiProperty({
    description: 'Event type',
    enum: VIDEO_WEBHOOK_EVENT_TYPES,
    example: 'session.started',
  })
  @IsIn(VIDEO_WEBHOOK_EVENT_TYPES)
  type: VideoWebhookEventType;

  @ApiProperty({
    description: 'Event payload data',
    type: VideoWebhookEventDataDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => VideoWebhookEventDataDto)
  data: VideoWebhookEventDataDto;

  @ApiPropertyOptional({
    description: 'ISO 8601 timestamp of the event',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  timestamp?: string;
}

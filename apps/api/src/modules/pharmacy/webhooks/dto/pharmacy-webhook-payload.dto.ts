import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';

/**
 * Incoming partner statuses that get mapped to internal PharmacyOrderStatus.
 */
export const PARTNER_STATUS_VALUES = [
  'accepted',
  'confirmed',
  'packed',
  'dispatched',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
] as const;

export type PartnerStatusValue = (typeof PARTNER_STATUS_VALUES)[number];

export class PharmacyWebhookPayloadDto {
  @ApiProperty({
    description: 'The order ID as known by the pharmacy partner',
    example: 'MOCK-ORD-1713600000000-1234',
  })
  @IsString()
  orderId: string;

  @ApiProperty({
    description: 'Partner-side order status',
    enum: PARTNER_STATUS_VALUES,
    example: 'packed',
  })
  @IsString()
  @IsIn(PARTNER_STATUS_VALUES)
  status: PartnerStatusValue;

  @ApiPropertyOptional({
    description: 'ISO 8601 timestamp of the status change',
    example: '2026-04-20T05:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  timestamp?: string;
}

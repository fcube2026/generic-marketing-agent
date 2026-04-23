import {
  IsOptional,
  IsString,
  IsNumber,
  IsIn,
  ValidateIf,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Either a manually-entered address (addressLine + city + state + pincode)
 * OR a map-derived location (lat + lng) is required. The service validates
 * that at least one of these two paths is fully populated.
 */
export class SelfAddressDto {
  @ApiProperty({ enum: ['MANUAL', 'MAP'] })
  @IsIn(['MANUAL', 'MAP'])
  source: 'MANUAL' | 'MAP';

  @ApiProperty({ required: false })
  @ValidateIf((o) => o.source === 'MANUAL')
  @IsString()
  @MaxLength(255)
  addressLine?: string;

  @ApiProperty({ required: false })
  @ValidateIf((o) => o.source === 'MANUAL')
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiProperty({ required: false })
  @ValidateIf((o) => o.source === 'MANUAL')
  @IsString()
  @MaxLength(80)
  state?: string;

  @ApiProperty({ required: false })
  @ValidateIf((o) => o.source === 'MANUAL')
  @IsString()
  @MaxLength(12)
  pincode?: string;

  @ApiProperty({ required: false })
  @ValidateIf((o) => o.source === 'MAP')
  @IsNumber()
  lat?: number;

  @ApiProperty({ required: false })
  @ValidateIf((o) => o.source === 'MAP')
  @IsNumber()
  lng?: number;

  @ApiProperty({
    required: false,
    description: 'Reverse-geocoded label, when available',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  formatted?: string;
}

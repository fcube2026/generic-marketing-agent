import { IsBoolean, IsOptional, IsNumber } from 'class-validator';

export class UpdateProviderAvailabilityDto {
  @IsBoolean()
  isAvailable: boolean;

  @IsOptional()
  @IsNumber()
  currentLat?: number;

  @IsOptional()
  @IsNumber()
  currentLng?: number;
}

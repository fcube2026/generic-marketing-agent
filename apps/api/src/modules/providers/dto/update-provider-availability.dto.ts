import { IsBoolean, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class UpdateProviderAvailabilityDto {
  @IsBoolean()
  isAvailable: boolean;

  @IsOptional()
  @IsNumber()
  currentLat?: number;

  @IsOptional()
  @IsNumber()
  currentLng?: number;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Service radius must be at least 1 km' })
  @Max(100, { message: 'Service radius must not exceed 100 km' })
  serviceRadius?: number;
}

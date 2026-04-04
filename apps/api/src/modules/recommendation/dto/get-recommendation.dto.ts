import { IsNumber, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class GetRecommendationDto {
  @Type(() => Number)
  @IsNumber()
  lat: number;

  @Type(() => Number)
  @IsNumber()
  lng: number;

  @IsString()
  serviceCategory: string;

  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
}

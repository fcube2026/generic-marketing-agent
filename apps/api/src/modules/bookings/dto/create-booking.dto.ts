import { IsString, IsEnum, IsDateString, IsOptional } from 'class-validator';
import { BookingMode } from '@prisma/client';

export class CreateBookingDto {
  @IsString()
  providerId: string;

  @IsString()
  serviceCategoryId: string;

  @IsOptional()
  @IsString()
  addressId?: string;

  @IsEnum(BookingMode)
  mode: BookingMode;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  symptoms?: string;
}

import {
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';
import { BookingMode } from '@prisma/client';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  providerId: string;

  @IsString()
  @IsNotEmpty()
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

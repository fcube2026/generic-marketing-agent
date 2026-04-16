import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  IsPositive,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsString()
  medicineId: string;

  @IsString()
  medicineName: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @IsPositive()
  unitPrice: number;
}

export class CreatePharmacyOrderDto {
  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsString()
  prescriptionId?: string;

  @IsString()
  partnerId: string;

  @IsString()
  deliveryAddressId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

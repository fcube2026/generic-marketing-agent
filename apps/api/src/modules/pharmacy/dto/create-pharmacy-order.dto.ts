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

export class InlineAddressDto {
  @IsString()
  addressLine: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  pincode: string;
}

export class OrderItemDto {
  @IsString()
  medicineCode: string;

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

  @IsOptional()
  @IsString()
  uploadedPrescriptionId?: string;

  @IsString()
  partnerId: string;

  @IsOptional()
  @IsString()
  deliveryAddressId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => InlineAddressDto)
  deliveryAddress?: InlineAddressDto;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class ApprovePrescriptionOrderItemDto {
  @IsString()
  medicineCode: string;

  @IsString()
  medicineName: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class ApprovePrescriptionOrderDto {
  @IsString()
  partnerId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovePrescriptionOrderItemDto)
  items: ApprovePrescriptionOrderItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

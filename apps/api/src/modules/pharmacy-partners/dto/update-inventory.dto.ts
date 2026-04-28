import {
  IsString,
  IsNumber,
  IsInt,
  IsPositive,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InventoryItemDto {
  @IsString()
  medicineName: string;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsInt()
  @Min(0)
  stock: number;
}

export class UpdateInventoryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryItemDto)
  items: InventoryItemDto[];
}

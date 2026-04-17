import { Transform } from 'class-transformer';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class SearchMedicineDto {
  @Transform(({ value, obj }) => value ?? obj.q)
  @IsString()
  @MinLength(2)
  query: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsString()
  partner?: string;
}

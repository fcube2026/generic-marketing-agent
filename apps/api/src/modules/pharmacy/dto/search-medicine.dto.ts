import { Transform } from 'class-transformer';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class SearchMedicineDto {
  @Transform(({ value, obj }) => value ?? obj.q ?? '')
  @IsString()
  @IsOptional()
  @MinLength(0)
  query: string = '';

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsString()
  partner?: string;
}

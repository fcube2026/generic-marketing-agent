import { IsString, MinLength } from 'class-validator';

export class SearchMedicineDto {
  @IsString()
  @MinLength(2)
  query: string;
}

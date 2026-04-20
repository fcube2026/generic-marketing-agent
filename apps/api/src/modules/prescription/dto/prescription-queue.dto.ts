import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

const SORT_FIELDS = ['createdAt', 'updatedAt'] as const;
const SORT_ORDERS = ['asc', 'desc'] as const;

export class PrescriptionQueueQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsIn(SORT_FIELDS)
  sortBy?: 'createdAt' | 'updatedAt';

  @IsOptional()
  @IsIn(SORT_ORDERS)
  order?: 'asc' | 'desc';
}

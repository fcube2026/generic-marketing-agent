import {
  IsString,
  MinLength,
  IsOptional,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateAdminUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}

import { IsString, IsOptional, IsArray, MinLength } from 'class-validator';

export class RegisterPharmacyPartnerDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  licenseNumber: string;

  @IsString()
  address: string;

  @IsString()
  contact: string;

  @IsOptional()
  @IsString()
  operatingHours?: string;

  /**
   * Mock document metadata — array of objects with { filename, path } shape.
   * No real file upload integration; paths are stored as-is.
   */
  @IsOptional()
  @IsArray()
  documents?: { filename: string; path: string }[];
}

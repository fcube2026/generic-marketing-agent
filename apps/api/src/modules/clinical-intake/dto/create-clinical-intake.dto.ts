import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClinicalIntakeDto {
  @ApiProperty({ description: 'Main reason for consultation' })
  @IsString()
  consultationReason: string;

  @ApiProperty({ description: 'Patient-described symptoms' })
  @IsString()
  symptoms: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  allergies?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentMedications?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  medicalHistory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasPets?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  petType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gateCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  floorNumber?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  patientAlone?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mobilityConstraint?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  infectionRiskFlag?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialInstructions?: string;
}

import { IsString, IsOptional, IsArray, IsNotEmpty } from 'class-validator';

export class CreateConsultationSummaryDto {
  @IsString()
  @IsNotEmpty()
  symptoms: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsString()
  @IsNotEmpty()
  diagnosis: string;

  @IsOptional()
  @IsArray()
  medicinesAdvised?: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes?: string;
  }[];

  @IsOptional()
  @IsString()
  nextSteps?: string;

  @IsOptional()
  @IsString()
  followUpRecommendation?: string;
}

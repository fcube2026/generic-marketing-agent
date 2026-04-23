import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Business Profile ────────────────────────────────────────────────────────

export class UpsertBusinessProfileDto {
  @IsOptional()
  @IsIn(['patients', 'providers', 'both'])
  primaryGrowthFocus?: string;

  @IsOptional()
  @IsIn(['supply', 'demand', 'activation'])
  biggestBottleneck?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyBudget?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  allocatedBudget?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetCities?: string[];

  @IsOptional()
  @IsString()
  bestPerforming?: string;

  @IsOptional()
  @IsString()
  topPatientPersona?: string;

  @IsOptional()
  @IsString()
  topReasonPatientChooses?: string;

  @IsOptional()
  @IsString()
  topReasonProviderJoins?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  competitors?: string[];

  @IsOptional()
  @IsBoolean()
  founderLedBrand?: boolean;
}

// ─── Campaigns ───────────────────────────────────────────────────────────────

export class UpsertCampaignDto {
  @IsString() name: string;
  @IsString() objective: string;
  @IsString() channel: string;
  @IsString() audience: string;
  @IsString() budget: string;
  @IsString() duration: string;
  @IsString() kpi: string;

  @IsOptional()
  @IsIn(['active', 'planned', 'completed', 'paused'])
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  headline?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  description?: string[];

  @IsOptional() @IsNumber() spend?: number;
  @IsOptional() @IsInt() impressions?: number;
  @IsOptional() @IsInt() conversions?: number;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
}

export class UpdateCampaignDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() objective?: string;
  @IsOptional() @IsString() channel?: string;
  @IsOptional() @IsString() audience?: string;
  @IsOptional() @IsString() budget?: string;
  @IsOptional() @IsString() duration?: string;
  @IsOptional() @IsString() kpi?: string;

  @IsOptional()
  @IsIn(['active', 'planned', 'completed', 'paused'])
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  headline?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  description?: string[];

  @IsOptional() @IsNumber() spend?: number;
  @IsOptional() @IsInt() impressions?: number;
  @IsOptional() @IsInt() conversions?: number;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
}

// ─── Experiments ─────────────────────────────────────────────────────────────

export class UpsertExperimentDto {
  @IsString() name: string;
  @IsString() hypothesis: string;
  @IsString() channel: string;
  @IsString() control: string;
  @IsString() variant: string;
  @IsString() metric: string;
  @IsString() startDate: string;
  @IsString() endDate: string;

  @IsOptional() @IsString() result?: string;
  @IsOptional() @IsIn(['control', 'variant', 'no-difference']) winner?: string;
  @IsOptional()
  @IsIn(['running', 'completed', 'planned', 'paused'])
  status?: string;
  @IsOptional() @IsString() lift?: string;
}

export class UpdateExperimentDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() hypothesis?: string;
  @IsOptional() @IsString() channel?: string;
  @IsOptional() @IsString() control?: string;
  @IsOptional() @IsString() variant?: string;
  @IsOptional() @IsString() metric?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsString() result?: string;
  @IsOptional() @IsIn(['control', 'variant', 'no-difference']) winner?: string;
  @IsOptional()
  @IsIn(['running', 'completed', 'planned', 'paused'])
  status?: string;
  @IsOptional() @IsString() lift?: string;
}

// ─── Content Calendar ────────────────────────────────────────────────────────

const CONTENT_PILLARS = [
  'patient-education',
  'provider-spotlight',
  'product-education',
  'social-proof',
  'local-health',
];

export class UpsertContentItemDto {
  @IsInt() @Min(1) week: number;
  @IsString() day: string;
  @IsString() platform: string;
  @IsIn(CONTENT_PILLARS) pillar: string;
  @IsString() title: string;
  @IsString() format: string;

  @IsOptional()
  @IsIn(['planned', 'in-progress', 'ready', 'published'])
  status?: string;

  @IsOptional() @IsString() scheduledAt?: string;
}

export class UpdateContentItemDto {
  @IsOptional() @IsInt() week?: number;
  @IsOptional() @IsString() day?: string;
  @IsOptional() @IsString() platform?: string;
  @IsOptional() @IsIn(CONTENT_PILLARS) pillar?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() format?: string;

  @IsOptional()
  @IsIn(['planned', 'in-progress', 'ready', 'published'])
  status?: string;

  @IsOptional() @IsString() scheduledAt?: string;
}

// ─── SEO ─────────────────────────────────────────────────────────────────────

export class UpsertSeoPageDto {
  @IsString() url: string;
  @IsIn(['city-specialty', 'condition', 'blog', 'comparison']) type: string;
  @IsString() title: string;
  @IsOptional() @IsIn(['live', 'in-progress', 'planned']) status?: string;
  @IsString() targetKeyword: string;
}

export class UpsertKeywordClusterDto {
  @IsString() cluster: string;
  @IsIn(['transactional', 'informational', 'comparison', 'provider-side'])
  type: string;
  @IsIn(['high', 'medium', 'low']) priority: string;
  @IsArray() keywords: Array<{
    keyword: string;
    volume: string;
    difficulty: string;
  }>;
}

// ─── Lifecycle Flows ─────────────────────────────────────────────────────────

export class LifecycleStepDto {
  @IsInt() day: number;
  @IsString() channel: string;
  @IsString() message: string;
  @IsString() goal: string;
}

export class UpsertLifecycleFlowDto {
  @IsString() name: string;
  @IsIn(['patient', 'provider']) segment: string;
  @IsString() trigger: string;
  @IsOptional() @IsIn(['active', 'draft', 'paused']) status?: string;

  @IsArray()
  @Type(() => LifecycleStepDto)
  steps: LifecycleStepDto[];
}

// ─── 90-Day Plan ─────────────────────────────────────────────────────────────

export class UpsertPlanItemDto {
  @IsIn(['1-30', '31-60', '61-90']) phase: string;
  @IsString() category: string;
  @IsString() task: string;
  @IsString() owner: string;
  @IsOptional() @IsBoolean() done?: boolean;
}

export class UpdatePlanItemDto {
  @IsOptional() @IsIn(['1-30', '31-60', '61-90']) phase?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() task?: string;
  @IsOptional() @IsString() owner?: string;
  @IsOptional() @IsBoolean() done?: boolean;
}

// ─── Intake Responses ────────────────────────────────────────────────────────

export class UpsertIntakeResponseDto {
  @IsString() questionId: string;
  // Value is freeform JSON: string | string[] | boolean | number
  value: unknown;
}

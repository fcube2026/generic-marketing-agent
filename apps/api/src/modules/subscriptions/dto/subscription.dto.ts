import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import {
  SubscriptionBillingCycle,
  SubscriptionCategory,
  SubscriptionStatus,
} from '@prisma/client';

export class CreateSubscriptionDto {
  @IsString()
  name!: string;

  @IsString()
  provider!: string;

  @IsOptional()
  @IsEnum(SubscriptionCategory)
  category?: SubscriptionCategory;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @IsOptional()
  @IsEnum(SubscriptionBillingCycle)
  billingCycle?: SubscriptionBillingCycle;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  plannedAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  actualAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  usageLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  usageConsumed?: number;

  @IsOptional()
  @IsString()
  usageUnit?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  seatsPlanned?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  seatsUsed?: number;

  @IsOptional()
  @IsDateString()
  planStartDate?: string;

  @IsOptional()
  @IsDateString()
  planEndDate?: string;

  @IsOptional()
  @IsDateString()
  renewalDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  reminderDays?: number;

  @IsOptional()
  @IsEmail()
  alertEmail?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSubscriptionDto extends PartialType(CreateSubscriptionDto) {}

export class CreateSubscriptionUsageLogDto {
  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  plannedAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  actualAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  usageLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  usageConsumed?: number;

  @IsOptional()
  @IsString()
  usageUnit?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  seatsPlanned?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  seatsUsed?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

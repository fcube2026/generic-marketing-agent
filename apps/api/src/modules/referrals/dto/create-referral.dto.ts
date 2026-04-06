import { IsString, IsOptional } from 'class-validator';

export class CreateReferralDto {
  @IsString()
  bookingId: string;

  @IsString()
  specialistType: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateReferralStatusDto {
  @IsString()
  status: string;
}

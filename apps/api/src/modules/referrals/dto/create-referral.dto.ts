import { IsString, IsOptional, IsIn } from 'class-validator';

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
  @IsIn(['RECOMMENDED', 'BOOKED', 'COMPLETED'])
  status: string;
}

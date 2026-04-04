import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  bookingId: string;

  @IsNumber()
  amount: number;
}

export class UpdatePaymentStatusDto {
  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  transactionId?: string;
}

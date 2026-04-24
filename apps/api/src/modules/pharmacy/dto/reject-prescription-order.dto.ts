import { IsString } from 'class-validator';

export class RejectPrescriptionOrderDto {
  @IsString()
  reason: string;
}

import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum VerifyAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REUPLOAD = 'REUPLOAD',
}

export class VerifyPrescriptionDto {
  @IsEnum(VerifyAction)
  action: VerifyAction;

  @IsOptional()
  @IsString()
  notes?: string;
}

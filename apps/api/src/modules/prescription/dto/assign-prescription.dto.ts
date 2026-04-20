import { IsNotEmpty, IsString } from 'class-validator';

export class AssignPrescriptionDto {
  @IsString()
  @IsNotEmpty()
  reviewerId: string;
}

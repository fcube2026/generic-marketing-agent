import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IdConfirmDto {
  @ApiProperty({ description: 'ID of the PatientIdDocument record' })
  @IsString()
  documentId: string;

  @ApiProperty({ description: 'ID of the PatientVerification record' })
  @IsString()
  verificationId: string;
}

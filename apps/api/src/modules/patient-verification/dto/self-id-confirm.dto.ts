import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SelfIdConfirmDto {
  @ApiProperty()
  @IsString()
  documentId: string;
}

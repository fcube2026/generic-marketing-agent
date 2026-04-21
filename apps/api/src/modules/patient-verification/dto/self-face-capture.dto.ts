import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SelfFaceCaptureDto {
  @ApiProperty({ description: 'MIME type of the captured selfie image' })
  @IsString()
  mimeType: string;

  @ApiProperty({
    required: false,
    description:
      'Optional client-supplied capture quality hint (good | poor). Server still mock-verifies success.',
    enum: ['good', 'poor'],
  })
  @IsOptional()
  @IsIn(['good', 'poor'])
  qualityHint?: 'good' | 'poor';
}

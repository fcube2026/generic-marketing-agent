import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SubmitFaceVerificationDto {
  /** Base64-encoded live face image captured on the device. */
  @IsString()
  @IsNotEmpty({ message: 'Live face image data is required' })
  liveFaceData: string;

  /** Optional reference image URL (e.g. fetched from SMC portal). */
  @IsOptional()
  @IsString()
  referenceImageData?: string;
}

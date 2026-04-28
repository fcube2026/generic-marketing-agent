import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class SubmitNmcVerificationDto {
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  fullName: string;

  @IsString()
  @IsNotEmpty({ message: 'Registration number is required' })
  nmcRegistrationNumber: string;

  @IsOptional()
  @IsString()
  stateCouncil?: string;

  @IsString()
  @IsNotEmpty({ message: 'Year of registration is required' })
  @Matches(/^\d{4}$/, {
    message: 'Year of registration must be a 4-digit year',
  })
  yearOfAdmission: string;

  @IsOptional()
  @IsString()
  licenseId?: string;
}

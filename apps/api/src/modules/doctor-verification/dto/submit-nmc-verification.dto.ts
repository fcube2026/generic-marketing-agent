import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class SubmitNmcVerificationDto {
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  fullName: string;

  @IsString()
  @IsNotEmpty({ message: 'NMC registration number is required' })
  nmcRegistrationNumber: string;

  @IsString()
  @IsNotEmpty({ message: 'State council is required' })
  stateCouncil: string;

  @IsString()
  @IsNotEmpty({ message: 'Year of admission is required' })
  @Matches(/^\d{4}$/, { message: 'Year of admission must be a 4-digit year' })
  yearOfAdmission: string;

  @IsOptional()
  @IsString()
  licenseId?: string;
}

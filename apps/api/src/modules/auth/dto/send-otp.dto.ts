import { IsString, Matches } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Invalid phone number format' })
  phone: string;
}

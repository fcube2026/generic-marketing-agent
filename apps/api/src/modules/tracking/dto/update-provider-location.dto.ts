import { IsNumber, IsString } from 'class-validator';

export class UpdateProviderLocationDto {
  @IsString()
  bookingId: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}

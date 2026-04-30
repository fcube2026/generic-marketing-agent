import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CurrentUser } from '../auth/decorators/roles.decorator';
import { CreatePatientProfileDto } from './dto/create-patient-profile.dto';
import {
  UpdatePatientProfileDto,
  CreateAddressDto,
  UpdateAddressDto,
} from './dto/update-patient-profile.dto';

@Controller('patients')
export class PatientsController {
  constructor(private patientsService: PatientsService) {}

  @Get('me')
  getMyProfile(@CurrentUser() user: any) {
    return this.patientsService.getMyProfile(user.id);
  }

  @Put('me')
  updateProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdatePatientProfileDto,
  ) {
    return this.patientsService.createOrUpdateProfile(user.id, dto);
  }

  @Post('me/profile')
  createProfile(
    @CurrentUser() user: any,
    @Body() dto: CreatePatientProfileDto,
  ) {
    return this.patientsService.createOrUpdateProfile(user.id, dto);
  }

  @Get('me/addresses')
  getAddresses(@CurrentUser() user: any) {
    return this.patientsService.getAddresses(user.id);
  }

  @Post('me/addresses')
  addAddress(@CurrentUser() user: any, @Body() dto: CreateAddressDto) {
    return this.patientsService.addAddress(user.id, dto);
  }

  @Put('me/addresses/:id')
  updateAddress(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.patientsService.updateAddress(user.id, id, dto);
  }

  @Delete('me/addresses/:id')
  deleteAddress(@CurrentUser() user: any, @Param('id') id: string) {
    return this.patientsService.deleteAddress(user.id, id);
  }

  @Get('me/bookings')
  getMyBookings(@CurrentUser() user: any) {
    return this.patientsService.getMyBookings(user.id);
  }

  @Get('me/video-consultations')
  getActiveVideoConsultations(@CurrentUser() user: any) {
    return this.patientsService.getActiveVideoConsultations(user.id);
  }
}

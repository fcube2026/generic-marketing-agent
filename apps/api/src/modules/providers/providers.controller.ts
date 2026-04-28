import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { CurrentUser } from '../auth/decorators/roles.decorator';
import { CreateProviderProfileDto } from './dto/create-provider-profile.dto';
import { UpdateProviderProfileDto } from './dto/update-provider-profile.dto';
import { UpdateProviderAvailabilityDto } from './dto/update-provider-availability.dto';
import { UploadKycDocumentDto } from './dto/upload-kyc-document.dto';
import { SearchNearbyProvidersDto } from './dto/search-nearby-providers.dto';
import { Public } from '../auth/decorators/roles.decorator';

@Controller('providers')
export class ProvidersController {
  constructor(private providersService: ProvidersService) {}

  @Post('onboard')
  onboard(@CurrentUser() user: any, @Body() dto: CreateProviderProfileDto) {
    return this.providersService.onboard(user.id, dto);
  }

  @Get('me')
  getMyProfile(@CurrentUser() user: any) {
    return this.providersService.getMyProfile(user.id);
  }

  @Put('me')
  updateProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateProviderProfileDto,
  ) {
    return this.providersService.updateProfile(user.id, dto);
  }

  @Put('me/availability')
  updateAvailability(
    @CurrentUser() user: any,
    @Body() dto: UpdateProviderAvailabilityDto,
  ) {
    return this.providersService.updateAvailability(user.id, dto);
  }

  @Get('me/bookings')
  getMyBookings(@CurrentUser() user: any) {
    return this.providersService.getMyBookings(user.id);
  }

  @Get('me/dashboard')
  getDashboard(@CurrentUser() user: any) {
    return this.providersService.getDashboard(user.id);
  }

  @Get('me/consultations')
  getConsultations(@CurrentUser() user: any) {
    return this.providersService.getConsultations(user.id);
  }

  @Get('me/patients')
  getPatients(@CurrentUser() user: any) {
    return this.providersService.getPatients(user.id);
  }

  @Get('me/patients/:patientId')
  getPatientConsultations(
    @CurrentUser() user: any,
    @Param('patientId') patientId: string,
  ) {
    return this.providersService.getPatientConsultations(user.id, patientId);
  }

  @Get('me/earnings')
  getEarnings(@CurrentUser() user: any) {
    return this.providersService.getEarnings(user.id);
  }

  @Get('me/incoming-requests')
  getIncomingRequests(@CurrentUser() user: any) {
    return this.providersService.getIncomingRequests(user.id);
  }

  @Public()
  @Get('nearby')
  getNearbyProviders(@Query() query: SearchNearbyProvidersDto) {
    const isVideoMode = query.mode === 'VIDEO_CONSULTATION';
    if (!isVideoMode && (query.lat == null || query.lng == null)) {
      throw new BadRequestException(
        'lat and lng are required for HOME_VISIT and DOCTOR_PLACE modes',
      );
    }
    return this.providersService.getNearbyProviders(
      query.lat ?? 0,
      query.lng ?? 0,
      query.serviceCategory,
      query.mode,
      query.serviceId,
    );
  }

  @Post('me/kyc')
  uploadKycDocument(
    @CurrentUser() user: any,
    @Body() dto: UploadKycDocumentDto,
  ) {
    return this.providersService.uploadKycDocument(user.id, dto);
  }

  @Get('me/kyc')
  getKycDocuments(@CurrentUser() user: any) {
    return this.providersService.getKycDocuments(user.id);
  }

  @Delete('me/kyc/:id')
  deleteKycDocument(@CurrentUser() user: any, @Param('id') documentId: string) {
    return this.providersService.deleteKycDocument(user.id, documentId);
  }
}

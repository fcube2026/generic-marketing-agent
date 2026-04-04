import { Controller, Get, Post, Put, Body, Query } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { CurrentUser } from '../auth/decorators/roles.decorator';
import { CreateProviderProfileDto } from './dto/create-provider-profile.dto';
import { UpdateProviderProfileDto } from './dto/update-provider-profile.dto';
import { UpdateProviderAvailabilityDto } from './dto/update-provider-availability.dto';
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

  @Public()
  @Get('nearby')
  getNearbyProviders(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('serviceCategory') serviceCategory?: string,
    @Query('mode') mode?: string,
  ) {
    return this.providersService.getNearbyProviders(
      parseFloat(lat),
      parseFloat(lng),
      serviceCategory,
      mode,
    );
  }
}

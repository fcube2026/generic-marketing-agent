import { Controller, Get, Put, Body, Param } from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { UpdateProviderLocationDto } from './dto/update-provider-location.dto';
import { CurrentUser } from '../auth/decorators/roles.decorator';

@Controller('tracking')
export class TrackingController {
  constructor(private trackingService: TrackingService) {}

  @Put('location')
  updateLocation(
    @CurrentUser() user: any,
    @Body() dto: UpdateProviderLocationDto,
  ) {
    return this.trackingService.updateLocation(user.id, dto);
  }

  @Get(':bookingId/location')
  getProviderLocation(
    @CurrentUser() user: any,
    @Param('bookingId') bookingId: string,
  ) {
    return this.trackingService.getProviderLocation(bookingId, user.id);
  }
}

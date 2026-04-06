import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { DeclineBookingDto } from './dto/decline-booking.dto';
import { CurrentUser } from '../auth/decorators/roles.decorator';

@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Post()
  createBooking(@CurrentUser() user: any, @Body() dto: CreateBookingDto) {
    return this.bookingsService.createBooking(user.id, dto);
  }

  @Get(':id')
  getBooking(@CurrentUser() user: any, @Param('id') bookingId: string) {
    return this.bookingsService.getBooking(bookingId, user.id);
  }

  @Put(':id/status')
  updateStatus(
    @CurrentUser() user: any,
    @Param('id') bookingId: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateBookingStatus(bookingId, user.id, dto);
  }

  @Post(':id/accept')
  acceptBooking(@CurrentUser() user: any, @Param('id') bookingId: string) {
    return this.bookingsService.acceptBooking(bookingId, user.id);
  }

  @Post(':id/decline')
  declineBooking(
    @CurrentUser() user: any,
    @Param('id') bookingId: string,
    @Body() dto: DeclineBookingDto,
  ) {
    return this.bookingsService.declineBooking(bookingId, user.id, dto.reason);
  }

  @Post(':id/cancel')
  cancelBooking(@CurrentUser() user: any, @Param('id') bookingId: string) {
    return this.bookingsService.cancelBooking(bookingId, user.id);
  }
}

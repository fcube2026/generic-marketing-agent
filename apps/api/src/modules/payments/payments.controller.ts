import { Controller, Post, Get, Put, Body, Param } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentDto,
  UpdatePaymentStatusDto,
} from './dto/create-payment.dto';
import { CurrentUser } from '../auth/decorators/roles.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post()
  initiatePayment(@Body() dto: CreatePaymentDto, @CurrentUser() user: any) {
    return this.paymentsService.initiatePayment(dto, user.id);
  }

  @Get(':bookingId')
  getPaymentStatus(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: any,
  ) {
    return this.paymentsService.getPaymentStatus(bookingId, user.id);
  }

  @Put(':id/status')
  updatePaymentStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.paymentsService.updatePaymentStatus(id, dto, user.id);
  }
}

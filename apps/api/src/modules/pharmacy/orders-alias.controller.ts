import { Body, Controller, Param, Post } from '@nestjs/common';
import { CurrentUser, Roles } from '../auth/decorators/roles.decorator';
import { PharmacyOrderService } from './pharmacy-order.service';
import { CreatePrescriptionOrderDto } from './dto/create-prescription-order.dto';

@Controller('orders')
export class OrdersAliasController {
  constructor(private readonly pharmacyOrderService: PharmacyOrderService) {}

  @Roles('PATIENT')
  @Post('prescription')
  createPrescriptionOrder(
    @CurrentUser() user: any,
    @Body() dto: CreatePrescriptionOrderDto,
  ) {
    return this.pharmacyOrderService.createPrescriptionOnlyOrder(user.id, dto);
  }

  @Roles('PATIENT')
  @Post(':id/pay')
  payOrder(@Param('id') id: string, @CurrentUser() user: any) {
    return this.pharmacyOrderService.payOrder(id, user.id);
  }
}

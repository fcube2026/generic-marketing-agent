import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, Roles } from '../auth/decorators/roles.decorator';
import { PharmacyOrderService } from './pharmacy-order.service';
import { ApprovePrescriptionOrderDto } from './dto/approve-prescription-order.dto';
import { RejectPrescriptionOrderDto } from './dto/reject-prescription-order.dto';

@ApiTags('admin-prescription-orders')
@ApiBearerAuth()
@Roles('ADMIN', 'PHARMACIST')
@Controller('admin/orders')
export class AdminPharmacyOrderController {
  constructor(private readonly pharmacyOrderService: PharmacyOrderService) {}

  @Get('prescriptions')
  @ApiOperation({
    summary: 'Get pending prescription-only orders for approval',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  listPending(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.pharmacyOrderService.listPendingPrescriptionApprovals(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post('prescriptions/:id/approve')
  @ApiOperation({
    summary: 'Approve prescription-only order and set medicines/pricing',
  })
  approve(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ApprovePrescriptionOrderDto,
  ) {
    return this.pharmacyOrderService.approvePrescriptionOrder(id, user.id, dto);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve prescription-only order (alias endpoint)' })
  approveAlias(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ApprovePrescriptionOrderDto,
  ) {
    return this.pharmacyOrderService.approvePrescriptionOrder(id, user.id, dto);
  }

  @Post('prescriptions/:id/reject')
  @ApiOperation({ summary: 'Reject prescription-only order' })
  reject(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: RejectPrescriptionOrderDto,
  ) {
    return this.pharmacyOrderService.rejectPrescriptionOrder(id, user.id, dto);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject prescription-only order (alias endpoint)' })
  rejectAlias(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: RejectPrescriptionOrderDto,
  ) {
    return this.pharmacyOrderService.rejectPrescriptionOrder(id, user.id, dto);
  }
}

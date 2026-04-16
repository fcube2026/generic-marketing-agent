import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Patch,
} from '@nestjs/common';
import { PharmacyService } from './pharmacy.service';
import { PharmacyOrderService } from './pharmacy-order.service';
import { CreatePharmacyOrderDto } from './dto/create-pharmacy-order.dto';
import { SearchMedicineDto } from './dto/search-medicine.dto';
import { CurrentUser } from '../auth/decorators/roles.decorator';

@Controller('pharmacy')
export class PharmacyController {
  constructor(
    private readonly pharmacyService: PharmacyService,
    private readonly pharmacyOrderService: PharmacyOrderService,
  ) {}

  /**
   * GET /pharmacy/medicines/search?query=paracetamol&partner=pharmeasy
   * Search medicines across one or all active pharmacy partners.
   */
  @Get('medicines/search')
  searchMedicines(
    @Query() dto: SearchMedicineDto,
    @Query('partner') partner?: string,
  ) {
    return this.pharmacyService.searchMedicines(dto.query, partner);
  }

  /**
   * GET /pharmacy/providers
   * List registered pharmacy partner keys.
   */
  @Get('providers')
  listProviders() {
    return this.pharmacyService.listProviders();
  }

  /**
   * POST /pharmacy/orders
   * Place a new pharmacy order on behalf of the authenticated patient.
   */
  @Post('orders')
  placeOrder(@CurrentUser() user: any, @Body() dto: CreatePharmacyOrderDto) {
    return this.pharmacyOrderService.placeOrder(user.id, dto);
  }

  /**
   * GET /pharmacy/orders/me
   * List all pharmacy orders for the authenticated patient.
   */
  @Get('orders/me')
  listMyOrders(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.pharmacyOrderService.listPatientOrders(
      user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  /**
   * GET /pharmacy/orders/:id
   * Retrieve a single pharmacy order (patient must own it).
   */
  @Get('orders/:id')
  getOrder(@Param('id') id: string, @CurrentUser() user: any) {
    return this.pharmacyOrderService.getOrder(id, user.id);
  }

  /**
   * PATCH /pharmacy/orders/:id/status
   * Pull the latest status from the partner API and persist it.
   */
  @Patch('orders/:id/status')
  refreshOrderStatus(@Param('id') id: string, @CurrentUser() user: any) {
    return this.pharmacyOrderService.refreshOrderStatus(id, user.id);
  }
}

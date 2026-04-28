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
import { PharmacyWebhookService } from './webhooks/pharmacy-webhook.service';
import { CreatePharmacyOrderDto } from './dto/create-pharmacy-order.dto';
import { CreatePrescriptionOrderDto } from './dto/create-prescription-order.dto';
import { SearchMedicineDto } from './dto/search-medicine.dto';
import { CurrentUser, Roles } from '../auth/decorators/roles.decorator';

@Controller('pharmacy')
export class PharmacyController {
  constructor(
    private readonly pharmacyService: PharmacyService,
    private readonly pharmacyOrderService: PharmacyOrderService,
    private readonly webhookService: PharmacyWebhookService,
  ) {}

  /**
   * GET /pharmacy/medicines/search?query=paracetamol&partner=demo-pharmacy
   * Search medicines across one or all active pharmacy partners.
   */
  @Get('medicines/search')
  searchMedicines(@Query() dto: SearchMedicineDto) {
    return this.pharmacyService.searchMedicines(
      dto.query,
      dto.pincode,
      dto.partner,
    );
  }

  /**
   * GET /pharmacy/partners
   * List active pharmacy partners.
   */
  @Get('partners')
  listPartners() {
    return this.pharmacyService.listPartners();
  }

  @Get('providers')
  listProvidersAlias() {
    return this.pharmacyService.listPartners();
  }

  /**
   * POST /pharmacy/orders
   * Place a new pharmacy order on behalf of the authenticated patient.
   */
  @Roles('PATIENT')
  @Post('orders')
  placeOrder(@CurrentUser() user: any, @Body() dto: CreatePharmacyOrderDto) {
    return this.pharmacyOrderService.placeOrder(user.id, dto);
  }

  /**
   * POST /pharmacy/orders/prescription
   * Create a prescription-only order without payment and without medicine items.
   */
  @Roles('PATIENT')
  @Post('orders/prescription')
  createPrescriptionOrder(
    @CurrentUser() user: any,
    @Body() dto: CreatePrescriptionOrderDto,
  ) {
    return this.pharmacyOrderService.createPrescriptionOnlyOrder(user.id, dto);
  }

  /**
   * GET /pharmacy/orders
   * List all pharmacy orders for the authenticated patient.
   */
  @Roles('PATIENT')
  @Get('orders')
  listOrders(
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

  @Roles('PATIENT')
  @Get('orders/me')
  listMyOrdersAlias(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listOrders(user, page, limit);
  }

  /**
   * GET /pharmacy/orders/:id
   * Retrieve a single pharmacy order (patient must own it).
   */
  @Roles('PATIENT')
  @Get('orders/:id')
  getOrder(@Param('id') id: string, @CurrentUser() user: any) {
    return this.pharmacyOrderService.getOrder(id, user.id);
  }

  @Roles('PATIENT')
  @Post('orders/:id/cancel')
  cancelOrder(@Param('id') id: string, @CurrentUser() user: any) {
    return this.pharmacyOrderService.cancelOrder(id, user.id);
  }

  /**
   * POST /pharmacy/orders/:id/pay
   * Mark an approved prescription order as paid.
   */
  @Roles('PATIENT')
  @Post('orders/:id/pay')
  payOrder(@Param('id') id: string, @CurrentUser() user: any) {
    return this.pharmacyOrderService.payOrder(id, user.id);
  }

  /**
   * POST /pharmacy/orders/:id/reupload
   * Re-upload prescription for an existing prescription order in reupload state.
   */
  @Roles('PATIENT')
  @Post('orders/:id/reupload')
  reuploadPrescriptionForOrder(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CreatePrescriptionOrderDto,
  ) {
    return this.pharmacyOrderService.reuploadPrescriptionForOrder(
      id,
      user.id,
      dto,
    );
  }

  /**
   * PATCH /pharmacy/orders/:id/status
   * Pull the latest status from the partner API and persist it.
   */
  @Roles('PATIENT')
  @Patch('orders/:id/status')
  refreshOrderStatus(@Param('id') id: string, @CurrentUser() user: any) {
    return this.pharmacyOrderService.refreshOrderStatus(id, user.id);
  }

  // ---------------------------------------------------------------------------
  // Webhook simulation endpoints (mock environment only)
  // ---------------------------------------------------------------------------

  /**
   * POST /pharmacy/webhooks/mock/:partnerOrderId/next
   * Immediately advance a mock order to its next status and emit a webhook event.
   * Useful for testing and demos without waiting for the scheduled progression.
   */
  @Post('webhooks/mock/:partnerOrderId/next')
  triggerNextWebhookEvent(@Param('partnerOrderId') partnerOrderId: string) {
    return this.webhookService.triggerNext(partnerOrderId);
  }

  /**
   * POST /pharmacy/webhooks/mock/:partnerOrderId/schedule
   * Start scheduling automatic status-progression events for a mock order.
   */
  @Post('webhooks/mock/:partnerOrderId/schedule')
  scheduleWebhookProgression(
    @Param('partnerOrderId') partnerOrderId: string,
    @Body('intervalMs') intervalMs?: number,
    @Body('maxSteps') maxSteps?: number,
  ) {
    return this.webhookService.scheduleProgression(
      partnerOrderId,
      intervalMs,
      maxSteps,
    );
  }

  /**
   * GET /pharmacy/webhooks/mock/events
   * Retrieve the recent in-memory webhook event log.
   */
  @Get('webhooks/mock/events')
  getWebhookEventLog(@Query('limit') limit?: string) {
    return this.webhookService.getEventLog(limit ? parseInt(limit, 10) : 50);
  }
}

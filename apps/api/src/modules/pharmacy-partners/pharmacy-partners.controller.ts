import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { PharmacyPartnersService } from './pharmacy-partners.service';
import { RegisterPharmacyPartnerDto } from './dto/register-pharmacy-partner.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { Public, Roles } from '../auth/decorators/roles.decorator';

@Controller()
export class PharmacyPartnersController {
  constructor(
    private readonly pharmacyPartnersService: PharmacyPartnersService,
  ) {}

  // -------------------------------------------------------------------------
  // Public / Pharmacy-facing endpoints
  // -------------------------------------------------------------------------

  /**
   * POST /pharmacy/partners/register
   * Register a new local pharmacy. Saved with PENDING status.
   */
  @Public()
  @Post('pharmacy/partners/register')
  register(@Body() dto: RegisterPharmacyPartnerDto) {
    return this.pharmacyPartnersService.register(dto);
  }

  /**
   * PUT /pharmacy/partners/:id/inventory
   * Update the medicine inventory for a registered pharmacy.
   */
  @Public()
  @Put('pharmacy/partners/:id/inventory')
  updateInventory(@Param('id') id: string, @Body() dto: UpdateInventoryDto) {
    return this.pharmacyPartnersService.updateInventory(id, dto);
  }

  // -------------------------------------------------------------------------
  // Admin endpoints
  // -------------------------------------------------------------------------

  /**
   * GET /admin/pharmacy/partners
   * List all pharmacy onboarding applications with status.
   */
  @Roles('ADMIN')
  @Get('admin/pharmacy/partners')
  findAll() {
    return this.pharmacyPartnersService.findAll();
  }

  /**
   * POST /admin/pharmacy/partners/:id/approve
   * Approve a pharmacy → status becomes ACTIVE.
   */
  @Roles('ADMIN')
  @Post('admin/pharmacy/partners/:id/approve')
  approve(@Param('id') id: string) {
    return this.pharmacyPartnersService.approve(id);
  }

  /**
   * POST /admin/pharmacy/partners/:id/reject
   * Reject a pharmacy → status becomes REJECTED.
   */
  @Roles('ADMIN')
  @Post('admin/pharmacy/partners/:id/reject')
  reject(@Param('id') id: string) {
    return this.pharmacyPartnersService.reject(id);
  }
}

import { Controller, Get, Put, Body, Param, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles, CurrentUser } from '../auth/decorators/roles.decorator';

@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('providers/pending')
  getPendingProviders() {
    return this.adminService.getPendingProviders();
  }

  @Put('providers/:id/verify')
  verifyProvider(
    @Param('id') providerId: string,
    @CurrentUser() user: any,
    @Body('notes') notes?: string,
  ) {
    return this.adminService.verifyProvider(providerId, user.id, notes);
  }

  @Put('providers/:id/deactivate')
  deactivateProvider(
    @Param('id') providerId: string,
    @CurrentUser() user: any,
    @Body('notes') notes?: string,
  ) {
    return this.adminService.deactivateProvider(providerId, user.id, notes);
  }

  @Get('bookings')
  getAllBookings(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getAllBookings(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status,
    );
  }

  @Get('diagnostics')
  getDiagnosticsOverview() {
    return this.adminService.getDiagnosticsOverview();
  }
}

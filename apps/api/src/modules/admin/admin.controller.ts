import { Controller, Get, Put, Body, Param, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CurrentUser } from '../auth/decorators/roles.decorator';

@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('providers')
  getAllProviders(@Query('status') status?: string) {
    return this.adminService.getAllProviders(status);
  }

  @Get('providers/pending')
  getPendingProviders() {
    return this.adminService.getPendingProviders();
  }

  @Get('providers/:id')
  getProviderById(@Param('id') providerId: string) {
    return this.adminService.getProviderById(providerId);
  }

  @Put('providers/:id/verify')
  verifyProvider(
    @Param('id') providerId: string,
    @CurrentUser() user: any,
    @Body('notes') notes?: string,
  ) {
    return this.adminService.verifyProvider(providerId, user.id, notes);
  }

  @Put('providers/:id/reject')
  rejectProvider(
    @Param('id') providerId: string,
    @CurrentUser() user: any,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.rejectProvider(providerId, user.id, reason);
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

  @Get('bookings/:id')
  getBookingById(@Param('id') bookingId: string) {
    return this.adminService.getBookingById(bookingId);
  }

  @Get('diagnostics')
  getDiagnosticsOverview() {
    return this.adminService.getDiagnosticsOverview();
  }

  @Get('referrals')
  getReferralsOverview() {
    return this.adminService.getReferralsOverview();
  }

  @Get('payouts')
  getAllPayouts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getAllPayouts(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status,
    );
  }

  @Get('payouts/summary')
  getPayoutsSummary() {
    return this.adminService.getPayoutsSummary();
  }

  @Put('payouts/:id/process')
  processPayoutRecord(@Param('id') payoutId: string, @CurrentUser() user: any) {
    return this.adminService.processPayoutRecord(payoutId, user.id);
  }
}

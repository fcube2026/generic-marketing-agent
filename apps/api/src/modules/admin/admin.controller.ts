import { Controller, Get, Put, Post, Body, Param, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CurrentUser, Roles } from '../auth/decorators/roles.decorator';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('dashboard/charts')
  getDashboardCharts() {
    return this.adminService.getDashboardCharts();
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
  getDiagnosticsOverview(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getDiagnosticsOverview(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status,
    );
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

  @Get('verification/queue')
  getVerificationQueue(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getVerificationQueue(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Post('verification/:licenseId/retry')
  retryNmcVerification(
    @Param('licenseId') licenseId: string,
    @CurrentUser() user: any,
  ) {
    return this.adminService.retryNmcVerification(licenseId, user.id);
  }

  @Get('video-sessions')
  getVideoSessions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getVideoSessions(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status,
    );
  }

  @Get('video-sessions/:id')
  getVideoSessionById(@Param('id') sessionId: string) {
    return this.adminService.getVideoSessionById(sessionId);
  }

  // ─── User Management ────────────────────────────────────────────

  @Get('users')
  getAdminUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAdminUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
    );
  }

  @Get('users/all')
  getAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      role,
      search,
    );
  }

  @Post('users')
  createAdminUser(@Body() dto: CreateAdminUserDto) {
    return this.adminService.createAdminUser(dto);
  }

  @Put('users/:id')
  updateAdminUser(
    @Param('id') userId: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.adminService.updateAdminUser(userId, dto);
  }

  @Put('users/:id/reset-password')
  resetUserPassword(
    @Param('id') userId: string,
    @Body('password') password: string,
  ) {
    return this.adminService.resetUserPassword(userId, password);
  }
}

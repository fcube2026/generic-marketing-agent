import { Controller, Post, Put, Get, Body, Param, Query } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import {
  CreateReferralDto,
  UpdateReferralStatusDto,
} from './dto/create-referral.dto';
import { CurrentUser } from '../auth/decorators/roles.decorator';

@Controller('referrals')
export class ReferralsController {
  constructor(private referralsService: ReferralsService) {}

  @Get('patient/me')
  getPatientReferrals(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.referralsService.getPatientReferrals(
      user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Post()
  createReferral(@Body() dto: CreateReferralDto, @CurrentUser() user: any) {
    return this.referralsService.createReferral(dto, user.id);
  }

  @Put(':id')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReferralStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.referralsService.updateStatus(id, dto, user.id);
  }
}

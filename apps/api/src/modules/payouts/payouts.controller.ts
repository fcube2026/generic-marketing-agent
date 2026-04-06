import { Controller, Get } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { CurrentUser } from '../auth/decorators/roles.decorator';

@Controller('payouts')
export class PayoutsController {
  constructor(private payoutsService: PayoutsService) {}

  @Get('me')
  getMyPayouts(@CurrentUser() user: any) {
    return this.payoutsService.getProviderPayouts(user.id);
  }

  @Get('me/summary')
  getMyEarningsSummary(@CurrentUser() user: any) {
    return this.payoutsService.getProviderEarningsSummary(user.id);
  }
}

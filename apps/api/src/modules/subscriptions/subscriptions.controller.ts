import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SubscriptionStatus } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateSubscriptionDto,
  CreateSubscriptionUsageLogDto,
  UpdateSubscriptionDto,
} from './dto/subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @ApiOperation({
    summary: 'Get subscription spend summary and renewal counts',
  })
  @Get('summary')
  summary() {
    return this.subscriptions.summary();
  }

  @ApiOperation({ summary: 'List all subscriptions' })
  @Get()
  list(@Query('status') status?: SubscriptionStatus) {
    return this.subscriptions.list(status);
  }

  @ApiOperation({ summary: 'Get one subscription with recent usage logs' })
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.subscriptions.getById(id);
  }

  @ApiOperation({ summary: 'Create a new subscription record' })
  @Post()
  create(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptions.create(dto);
  }

  @ApiOperation({ summary: 'Update an existing subscription record' })
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.subscriptions.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a subscription record' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.subscriptions.remove(id);
  }

  @ApiOperation({ summary: 'Append a usage/cost snapshot for a subscription' })
  @Post(':id/usage-logs')
  addUsageLog(
    @Param('id') id: string,
    @Body() dto: CreateSubscriptionUsageLogDto,
  ) {
    return this.subscriptions.addUsageLog(id, dto);
  }
}

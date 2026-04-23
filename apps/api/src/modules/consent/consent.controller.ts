import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser } from '../auth/decorators/roles.decorator';
import { ConsentService } from './consent.service';
import { AcceptConsentDto } from './dto/accept-consent.dto';

@ApiTags('Consent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('consent')
export class ConsentController {
  constructor(private readonly service: ConsentService) {}

  @Post('accept')
  @Roles('PATIENT')
  @ApiOperation({ summary: 'Accept consent for a booking' })
  accept(
    @CurrentUser() user: any,
    @Body() dto: AcceptConsentDto,
    @Request() req: any,
  ) {
    const ip =
      req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ?? req.ip ?? null;
    return this.service.acceptConsent(user.id, dto, ip);
  }

  @Get('text')
  @Roles('PATIENT', 'PROVIDER', 'ADMIN')
  @ApiOperation({ summary: 'Get consent text for a given version' })
  @ApiQuery({ name: 'version', required: false })
  getText(@Query('version') version?: string) {
    return this.service.getConsentText(version);
  }

  @Get(':bookingId')
  @Roles('PATIENT', 'ADMIN')
  @ApiOperation({ summary: 'Get consent record for a booking' })
  @ApiParam({ name: 'bookingId' })
  get(
    @CurrentUser() user: any,
    @Param('bookingId') bookingId: string,
    @Request() req: any,
  ) {
    return this.service.getConsent(user.id, bookingId, req.user?.role);
  }
}

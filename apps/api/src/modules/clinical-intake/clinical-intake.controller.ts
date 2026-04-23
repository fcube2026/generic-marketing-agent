import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser } from '../auth/decorators/roles.decorator';
import { ClinicalIntakeService } from './clinical-intake.service';
import { CreateClinicalIntakeDto } from './dto/create-clinical-intake.dto';

@ApiTags('Clinical Intake')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clinical-intake')
export class ClinicalIntakeController {
  constructor(private readonly service: ClinicalIntakeService) {}

  @Post(':bookingId')
  @Roles('PATIENT')
  @ApiOperation({ summary: 'Submit clinical intake form for a booking' })
  @ApiParam({ name: 'bookingId' })
  create(
    @CurrentUser() user: any,
    @Param('bookingId') bookingId: string,
    @Body() dto: CreateClinicalIntakeDto,
  ) {
    return this.service.createIntake(user.id, bookingId, dto);
  }

  @Get(':bookingId')
  @Roles('PATIENT', 'PROVIDER', 'ADMIN')
  @ApiOperation({ summary: 'Retrieve clinical intake for a booking' })
  @ApiParam({ name: 'bookingId' })
  get(
    @CurrentUser() user: any,
    @Param('bookingId') bookingId: string,
    @Request() req: any,
  ) {
    return this.service.getIntake(user.id, bookingId, req.user?.role);
  }
}

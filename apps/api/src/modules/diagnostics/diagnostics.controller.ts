import { Controller, Post, Put, Get, Body, Param, Query } from '@nestjs/common';
import { DiagnosticsService } from './diagnostics.service';
import {
  CreateDiagnosticRequestDto,
  UpdateDiagnosticStatusDto,
  UploadLabResultDto,
} from './dto/create-diagnostic-request.dto';
import { CurrentUser } from '../auth/decorators/roles.decorator';

@Controller('diagnostics')
export class DiagnosticsController {
  constructor(private diagnosticsService: DiagnosticsService) {}

  @Get('patient/me')
  getPatientDiagnostics(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.diagnosticsService.getPatientDiagnostics(
      user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Post()
  createRequest(
    @Body() dto: CreateDiagnosticRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.diagnosticsService.createRequest(dto, user.id);
  }

  @Put(':id')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDiagnosticStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.diagnosticsService.updateStatus(id, dto, user.id);
  }

  @Post(':id/result')
  uploadResult(
    @Param('id') id: string,
    @Body() dto: UploadLabResultDto,
    @CurrentUser() user: any,
  ) {
    return this.diagnosticsService.uploadResult(id, dto, user.id);
  }
}

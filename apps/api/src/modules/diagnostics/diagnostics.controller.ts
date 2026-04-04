import { Controller, Post, Put, Body, Param } from '@nestjs/common';
import { DiagnosticsService } from './diagnostics.service';
import { CreateDiagnosticRequestDto, UpdateDiagnosticStatusDto, UploadLabResultDto } from './dto/create-diagnostic-request.dto';

@Controller('diagnostics')
export class DiagnosticsController {
  constructor(private diagnosticsService: DiagnosticsService) {}

  @Post()
  createRequest(@Body() dto: CreateDiagnosticRequestDto) {
    return this.diagnosticsService.createRequest(dto);
  }

  @Put(':id')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateDiagnosticStatusDto) {
    return this.diagnosticsService.updateStatus(id, dto);
  }

  @Post(':id/result')
  uploadResult(@Param('id') id: string, @Body() dto: UploadLabResultDto) {
    return this.diagnosticsService.uploadResult(id, dto);
  }
}

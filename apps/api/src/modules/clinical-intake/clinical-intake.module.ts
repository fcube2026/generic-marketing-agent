import { Module } from '@nestjs/common';
import { ClinicalIntakeService } from './clinical-intake.service';
import { ClinicalIntakeController } from './clinical-intake.controller';
import { TriageService } from './triage.service';

@Module({
  providers: [ClinicalIntakeService, TriageService],
  controllers: [ClinicalIntakeController],
  exports: [ClinicalIntakeService],
})
export class ClinicalIntakeModule {}

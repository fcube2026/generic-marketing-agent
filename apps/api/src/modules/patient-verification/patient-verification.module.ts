import { Module } from '@nestjs/common';
import { PatientVerificationService } from './patient-verification.service';
import { PatientVerificationController } from './patient-verification.controller';
import { RiskEngineService } from './risk-engine.service';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [SmsModule],
  providers: [PatientVerificationService, RiskEngineService],
  controllers: [PatientVerificationController],
  exports: [PatientVerificationService],
})
export class PatientVerificationModule {}

import { Module } from '@nestjs/common';
import { PatientVerificationService } from './patient-verification.service';
import { PatientVerificationController } from './patient-verification.controller';
import { RiskEngineService } from './risk-engine.service';
import { KycMlClient } from './kyc-ml.client';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [SmsModule],
  providers: [PatientVerificationService, RiskEngineService, KycMlClient],
  controllers: [PatientVerificationController],
  exports: [PatientVerificationService],
})
export class PatientVerificationModule {}

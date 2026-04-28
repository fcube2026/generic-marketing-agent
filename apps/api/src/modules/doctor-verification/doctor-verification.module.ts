import { Module } from '@nestjs/common';
import { DoctorVerificationService } from './doctor-verification.service';
import { DoctorVerificationController } from './doctor-verification.controller';
import { NmcApiProvider } from './providers/nmc-api.provider';
import { SmcScraperProvider } from './providers/smc-scraper.provider';
import { FaceVerificationProvider } from './providers/face-verification.provider';
import { AadhaarValidationProvider } from './providers/aadhaar-validation.provider';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [
    DoctorVerificationService,
    NmcApiProvider,
    SmcScraperProvider,
    FaceVerificationProvider,
    AadhaarValidationProvider,
  ],
  controllers: [DoctorVerificationController],
  exports: [DoctorVerificationService],
})
export class DoctorVerificationModule {}

import { Module } from '@nestjs/common';
import { VisitOtpService } from './visit-otp.service';
import { VisitOtpController } from './visit-otp.controller';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [SmsModule],
  providers: [VisitOtpService],
  controllers: [VisitOtpController],
  exports: [VisitOtpService],
})
export class VisitOtpModule {}

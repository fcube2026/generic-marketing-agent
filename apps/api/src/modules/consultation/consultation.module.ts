import { Module } from '@nestjs/common';
import { ConsultationService } from './consultation.service';
import { ConsultationController } from './consultation.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrescriptionModule } from '../prescription/prescription.module';

@Module({
  imports: [NotificationsModule, PrescriptionModule],
  providers: [ConsultationService],
  controllers: [ConsultationController],
})
export class ConsultationModule {}

import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { DoctorVerificationModule } from '../doctor-verification/doctor-verification.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DoctorVerificationModule, NotificationsModule],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}

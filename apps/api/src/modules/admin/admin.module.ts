import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { DoctorVerificationModule } from '../doctor-verification/doctor-verification.module';

@Module({
  imports: [DoctorVerificationModule],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}

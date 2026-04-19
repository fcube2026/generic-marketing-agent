import { Module } from '@nestjs/common';
import { PrescriptionController } from './prescription.controller';
import { AdminPrescriptionController } from './admin-prescription.controller';
import { PrescriptionService } from './prescription.service';
import { PrescriptionStorageService } from './prescription-storage.service';

@Module({
  controllers: [PrescriptionController, AdminPrescriptionController],
  providers: [PrescriptionService, PrescriptionStorageService],
  exports: [PrescriptionService],
})
export class PrescriptionModule {}

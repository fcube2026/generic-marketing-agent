import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { VideoConsultationModule } from '../video-consultation/video-consultation.module';
import { PatientVerificationModule } from '../patient-verification/patient-verification.module';
import { SupabaseSyncModule } from '../../common/supabase/supabase-sync.module';

@Module({
  imports: [
    NotificationsModule,
    VideoConsultationModule,
    PatientVerificationModule,
    SupabaseSyncModule,
  ],
  providers: [BookingsService],
  controllers: [BookingsController],
  exports: [BookingsService],
})
export class BookingsModule {}

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './common/prisma/prisma.module';
import { FeatureFlagsModule } from './common/feature-flags/feature-flags.module';
import { QueueModule } from './common/queue/queue.module';
import { AuthModule } from './modules/auth/auth.module';
import { PatientsModule } from './modules/patients/patients.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { ServicesModule } from './modules/services/services.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { RecommendationModule } from './modules/recommendation/recommendation.module';
import { ConsultationModule } from './modules/consultation/consultation.module';
import { DiagnosticsModule } from './modules/diagnostics/diagnostics.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PayoutsModule } from './modules/payouts/payouts.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { DoctorVerificationModule } from './modules/doctor-verification/doctor-verification.module';
import { PharmacyModule } from './modules/pharmacy/pharmacy.module';
import { SmsModule } from './modules/sms/sms.module';
import { VideoSessionsModule } from './modules/video-sessions/video-sessions.module';
import { PushNotificationModule } from './modules/push-notifications/push-notification.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { BootstrapService } from './common/bootstrap.service';
import { HealthModule } from './common/health/health.module';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    FeatureFlagsModule,
    QueueModule,
    SmsModule,
    PushNotificationModule,
    WhatsAppModule,
    AuthModule,
    PatientsModule,
    ProvidersModule,
    ServicesModule,
    BookingsModule,
    RecommendationModule,
    ConsultationModule,
    DiagnosticsModule,
    PaymentsModule,
    PayoutsModule,
    AdminModule,
    NotificationsModule,
    ReferralsModule,
    TrackingModule,
    DoctorVerificationModule,
    PharmacyModule,
    VideoSessionsModule,
  ],
  providers: [BootstrapService],
})
export class AppModule {}

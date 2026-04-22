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
import { PrescriptionModule } from './modules/prescription/prescription.module';
import { SmsModule } from './modules/sms/sms.module';
import { VideoSessionsModule } from './modules/video-sessions/video-sessions.module';
import { VideoConsultationModule } from './modules/video-consultation/video-consultation.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { PushNotificationModule } from './modules/push-notifications/push-notification.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { PatientVerificationModule } from './modules/patient-verification/patient-verification.module';
import { ClinicalIntakeModule } from './modules/clinical-intake/clinical-intake.module';
import { ConsentModule } from './modules/consent/consent.module';
import { VisitOtpModule } from './modules/visit-otp/visit-otp.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
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
    PrescriptionModule,
    VideoSessionsModule,
    VideoConsultationModule,
    WebhooksModule,
    MarketingModule,
    PatientVerificationModule,
    ClinicalIntakeModule,
    ConsentModule,
    VisitOtpModule,
    SubscriptionsModule,
  ],
  providers: [BootstrapService],
})
export class AppModule {}

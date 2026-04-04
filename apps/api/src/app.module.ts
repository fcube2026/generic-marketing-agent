import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { PatientsModule } from './modules/patients/patients.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { ServicesModule } from './modules/services/services.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { RecommendationModule } from './modules/recommendation/recommendation.module';
import { ConsultationModule } from './modules/consultation/consultation.module';
import { DiagnosticsModule } from './modules/diagnostics/diagnostics.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    PatientsModule,
    ProvidersModule,
    ServicesModule,
    BookingsModule,
    RecommendationModule,
    ConsultationModule,
    DiagnosticsModule,
    PaymentsModule,
    AdminModule,
  ],
})
export class AppModule {}

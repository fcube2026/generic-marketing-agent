import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

/**
 * Creates and configures a NestJS application for integration testing.
 * The app mirrors the production configuration (validation pipes, global prefix).
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.setGlobalPrefix('api/v1');

  await app.init();
  return app;
}

/**
 * Cleans all test data from the database in the correct order
 * to avoid foreign key constraint violations.
 */
export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  await prisma.providerLocation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.adminAction.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.labResult.deleteMany();
  await prisma.diagnosticRequest.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.consultationSummary.deleteMany();
  await prisma.bookingStatusHistory.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.doctorKitItem.deleteMany();
  await prisma.doctorKit.deleteMany();
  await prisma.availabilitySlot.deleteMany();
  await prisma.providerService.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.providerLicense.deleteMany();
  await prisma.address.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.providerProfile.deleteMany();
  await prisma.otpVerification.deleteMany();
  await prisma.user.deleteMany();
}

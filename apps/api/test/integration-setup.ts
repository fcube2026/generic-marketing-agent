import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import type { Request, Response } from 'express';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

/**
 * Creates and configures a NestJS application for integration testing.
 * The middleware stack mirrors the production configuration in main.ts so that
 * integration tests exercise the same behaviour the live server provides:
 *   - Custom body-parser limits (10 MB)
 *   - JSON error handler that returns well-formed JSON for body-parser failures
 *     instead of allowing the connection to be closed without a response
 *   - Global exception filter for consistent error response format
 *   - Global validation pipe
 *   - api/v1 global prefix
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  // Disable NestJS's built-in body-parser so we can configure limits ourselves,
  // matching the production setup in main.ts.
  const app = moduleFixture.createNestApplication({ bodyParser: false });

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // Mirror the production body-parser error handler from main.ts.
  // Without this, body-parser errors (malformed JSON, payload too large, etc.)
  // fall through to Express's default finalhandler which returns an HTML page
  // rather than the JSON error format the tests and API clients expect.
  app.use(
    (err: any, req: Request, res: Response, next: (err?: any) => void) => {
      if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Invalid JSON in request body',
          error: 'Bad Request',
          timestamp: new Date().toISOString(),
          path: req.url,
        });
      }

      if (typeof err.status === 'number') {
        return res.status(err.status).json({
          success: false,
          statusCode: err.status,
          message: err.message || 'Request parsing error',
          error: err.type || 'Error',
          timestamp: new Date().toISOString(),
          path: req.url,
        });
      }

      next(err);
    },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

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

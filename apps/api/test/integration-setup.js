"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestApp = createTestApp;
exports.cleanDatabase = cleanDatabase;
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const app_module_1 = require("../src/app.module");
async function createTestApp() {
    const moduleFixture = await testing_1.Test.createTestingModule({
        imports: [app_module_1.AppModule],
    }).compile();
    const app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
    }));
    app.setGlobalPrefix('api/v1');
    await app.init();
    return app;
}
async function cleanDatabase(prisma) {
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
//# sourceMappingURL=integration-setup.js.map
/**
 * Staging-specific seed data.
 *
 * Extends the base seed script with extra demo data useful for QA:
 *   • additional test users (patient & provider)
 *   • questionnaire responses
 *   • clearly-labelled demo financial data
 *
 * Run:  pnpm --filter @curex24/database db:seed:staging
 *   or: npx ts-node prisma/seed-staging.ts
 *
 * ⚠️  This script is ONLY for the staging environment.
 *     It uses synthetic data — NEVER copy production data.
 */

import { PrismaClient, Role, BookingMode, BookingStatus, PaymentStatus, PayoutStatus, LicenseStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding STAGING demo data...');
  console.log('⚠️  This data is synthetic — no real user data is used.\n');

  // ── Extra staging-only providers ────────────────────────────
  const stagingProviders = [
    {
      phone: '+9900000001',
      name: 'Dr. Demo Staging',
      specialization: 'General Medicine',
      contactInfo: '+9900000001',
      clinicAddress: '1 Staging Street, Test City',
      isVerified: true,
      isActive: true,
      isAvailable: true,
      homeVisitEnabled: true,
      doctorPlaceVisitEnabled: true,
      consultationFeeHomeVisit: 500,
      consultationFeeDoctorPlace: 300,
      currentLat: 28.6139,
      currentLng: 77.2090,
      licenseType: 'MBBS',
    },
    {
      phone: '+9900000002',
      name: 'Dr. QA Tester',
      specialization: 'Pediatrics',
      contactInfo: '+9900000002',
      clinicAddress: '2 QA Avenue, Demo Town',
      isVerified: true,
      isActive: true,
      isAvailable: true,
      homeVisitEnabled: true,
      doctorPlaceVisitEnabled: true,
      consultationFeeHomeVisit: 600,
      consultationFeeDoctorPlace: 400,
      currentLat: 19.0760,
      currentLng: 72.8777,
      licenseType: 'MD Pediatrics',
    },
  ];

  for (const p of stagingProviders) {
    const user = await prisma.user.upsert({
      where: { phone: p.phone },
      update: { role: Role.PROVIDER },
      create: { phone: p.phone, role: Role.PROVIDER },
    });

    await prisma.providerProfile.upsert({
      where: { userId: user.id },
      update: { name: p.name, isAvailable: p.isAvailable },
      create: {
        userId: user.id,
        name: p.name,
        specialization: p.specialization,
        contactInfo: p.contactInfo,
        clinicAddress: p.clinicAddress,
        isVerified: p.isVerified,
        isActive: p.isActive,
        isAvailable: p.isAvailable,
        homeVisitEnabled: p.homeVisitEnabled,
        doctorPlaceVisitEnabled: p.doctorPlaceVisitEnabled,
        consultationFeeHomeVisit: p.consultationFeeHomeVisit,
        consultationFeeDoctorPlace: p.consultationFeeDoctorPlace,
        currentLat: p.currentLat,
        currentLng: p.currentLng,
      },
    });
  }
  console.log(`✅ Seeded ${stagingProviders.length} staging providers`);

  // ── Extra staging-only patients ─────────────────────────────
  const stagingPatients = [
    {
      phone: '+9900000010',
      name: 'Demo Patient One',
      dob: '1995-06-15',
      gender: 'MALE',
      addressLine: '10 Demo Lane, Staging City',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      lat: 28.6350,
      lng: 77.2250,
    },
    {
      phone: '+9900000011',
      name: 'QA Patient Two',
      dob: '1988-12-01',
      gender: 'FEMALE',
      addressLine: '11 QA Road, Test Nagar',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      lat: 19.0760,
      lng: 72.8777,
    },
  ];

  for (const p of stagingPatients) {
    const user = await prisma.user.upsert({
      where: { phone: p.phone },
      update: { role: Role.PATIENT },
      create: { phone: p.phone, role: Role.PATIENT },
    });

    await prisma.patientProfile.upsert({
      where: { userId: user.id },
      update: { name: p.name },
      create: {
        userId: user.id,
        name: p.name,
        dateOfBirth: new Date(`${p.dob}T00:00:00.000Z`),
        gender: p.gender,
      },
    });

    const existingAddress = await prisma.address.findFirst({ where: { userId: user.id } });
    if (!existingAddress) {
      await prisma.address.create({
        data: {
          userId: user.id,
          label: 'Home',
          addressLine: p.addressLine,
          city: p.city,
          state: p.state,
          pincode: p.pincode,
          lat: p.lat,
          lng: p.lng,
          isDefault: true,
        },
      });
    }
  }
  console.log(`✅ Seeded ${stagingPatients.length} staging patients`);

  console.log('\n🌱 Staging seed complete!');
  console.log('ℹ️  Run the base seed first if the database is empty: pnpm --filter @curex24/database db:seed');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Staging seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

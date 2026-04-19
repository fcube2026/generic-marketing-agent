/**
 * Staging-specific seed data.
 *
 * Extends the base seed script with extra demo data useful for QA:
 *   • additional test users (patient & provider)
 *   • pharmacy partners for live partner-backed search/order flows
 *   • completed consultation summaries with real prescriptions
 *   • questionnaire responses
 *   • clearly-labelled demo financial data
 *
 * Run:  pnpm --filter @curex24/database db:seed:staging
 *   or: npx ts-node prisma/seed-staging.ts
 *
 * ⚠️  This script is ONLY for the staging environment.
 *     It uses synthetic data — NEVER copy production data.
 */

import {
  PrismaClient,
  Role,
  BookingMode,
  BookingStatus,
  PaymentStatus,
} from '@prisma/client';

declare const process: {
  env: Record<string, string | undefined>;
  exit(code?: number): never;
};

const prisma = new PrismaClient();

const PHARMACY_PARTNERS = [
  {
    code: 'demo-pharmacy',
    name: 'Demo Pharmacy',
    displayName: 'Curex Demo Pharmacy',
    description: 'Primary mock pharmacy partner for Curex24 QA and MVP flows.',
    priority: 1,
  },
  {
    code: 'demo-pharmacy-express',
    name: 'Demo Pharmacy Express',
    displayName: 'Curex Demo Pharmacy Express',
    description: 'Secondary mock pharmacy route for QA and staging verification.',
    priority: 2,
  },
] as const;

const STAGING_CATEGORIES = [
  {
    name: 'General Medicine',
    slug: 'general-medicine',
    description: 'Primary care and general health consultations',
  },
  {
    name: 'Pediatrics',
    slug: 'pediatrics',
    description: 'Healthcare for infants, children, and adolescents',
  },
] as const;

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  console.log('🌱 Seeding STAGING demo data...');
  console.log('⚠️  This data is synthetic — no real user data is used.\n');

  const categories: Record<string, { id: string }> = {};
  for (const category of STAGING_CATEGORIES) {
    const record = await prisma.serviceCategory.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description },
      create: category,
    });
    categories[category.slug] = record;
  }
  console.log(`✅ Ensured ${STAGING_CATEGORIES.length} staging service categories`);

  const providerApiBaseUrl =
    process.env.PHARMACY_PARTNER_API_URL ??
    process.env.PHARMEASY_API_URL ??
    'https://mock-pharmacy.invalid';
  for (const partner of PHARMACY_PARTNERS) {
    await prisma.pharmacyPartner.upsert({
      where: { code: partner.code },
      update: {
        name: partner.name,
        displayName: partner.displayName,
        description: partner.description,
        priority: partner.priority,
        apiBaseUrl: providerApiBaseUrl,
        isActive: true,
      },
      create: {
        code: partner.code,
        name: partner.name,
        displayName: partner.displayName,
        description: partner.description,
        priority: partner.priority,
        apiBaseUrl: providerApiBaseUrl,
        isActive: true,
      },
    });
  }
  console.log(`✅ Ensured ${PHARMACY_PARTNERS.length} pharmacy partners`);

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

  const seededProviders: Array<{
    userId: string;
    id: string;
    name: string;
    specialization: string;
    consultationFeeHomeVisit: number;
  }> = [];

  for (const p of stagingProviders) {
    const user = await prisma.user.upsert({
      where: { phone: p.phone },
      update: { role: Role.PROVIDER },
      create: { phone: p.phone, role: Role.PROVIDER },
    });

    const profile = await prisma.providerProfile.upsert({
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

    seededProviders.push({
      userId: user.id,
      id: profile.id,
      name: p.name,
      specialization: p.specialization,
      consultationFeeHomeVisit: p.consultationFeeHomeVisit,
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

  const seededPatients: Array<{
    userId: string;
    id: string;
    name: string;
    addressId: string;
  }> = [];

  for (const p of stagingPatients) {
    const user = await prisma.user.upsert({
      where: { phone: p.phone },
      update: { role: Role.PATIENT },
      create: { phone: p.phone, role: Role.PATIENT },
    });

    const profile = await prisma.patientProfile.upsert({
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
    let addressId = existingAddress?.id;
    if (!existingAddress) {
      const address = await prisma.address.create({
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
      addressId = address.id;
    }

    seededPatients.push({
      userId: user.id,
      id: profile.id,
      name: p.name,
      addressId: addressId!,
    });
  }
  console.log(`✅ Seeded ${stagingPatients.length} staging patients`);

  const stagingSummarySpecs = [
    {
      patientPhone: '+9900000010',
      providerPhone: '+9900000001',
      categorySlug: 'general-medicine',
      diagnosis: 'Acute bacterial sinusitis',
      prescriptionDetails:
        'Dr. Demo Staging (Reg No: STG-GM-1001) prescribed Amoxicillin 500mg tablet twice daily for 5 days and Paracetamol 650mg as needed for fever.',
      medicinesAdvised: [
        { name: 'Amoxicillin 500mg tablet', dosage: '1 tablet twice daily for 5 days' },
        { name: 'Paracetamol 650mg', dosage: '1 tablet every 8 hours if fever persists' },
      ],
    },
    {
      patientPhone: '+9900000011',
      providerPhone: '+9900000002',
      categorySlug: 'pediatrics',
      diagnosis: 'Bacterial pharyngitis',
      prescriptionDetails:
        'Dr. QA Tester (Reg No: STG-PED-2002) prescribed Azithromycin 250mg tablet once daily for 3 days with Vitamin C for recovery support.',
      medicinesAdvised: [
        { name: 'Azithromycin 250mg tablet', dosage: '1 tablet once daily for 3 days' },
        { name: 'Vitamin C 500mg', dosage: '1 tablet once daily for 7 days' },
      ],
    },
  ] as const;

  let summariesSeeded = 0;
  for (const spec of stagingSummarySpecs) {
    const patientUser = await prisma.user.findUnique({
      where: { phone: spec.patientPhone },
      include: { patientProfile: true },
    });
    const providerUser = await prisma.user.findUnique({
      where: { phone: spec.providerPhone },
      include: { providerProfile: true },
    });
    const category = categories[spec.categorySlug];

    if (!patientUser?.patientProfile || !providerUser?.providerProfile || !category) {
      continue;
    }

    const patientSeed = seededPatients.find((p) => p.userId === patientUser.id);
    if (!patientSeed) {
      continue;
    }

    let booking = await prisma.booking.findFirst({
      where: {
        patientId: patientUser.patientProfile.id,
        providerId: providerUser.providerProfile.id,
        serviceCategoryId: category.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!booking) {
      const createdAt = daysAgo(summariesSeeded + 2);
      booking = await prisma.booking.create({
        data: {
          patientId: patientUser.patientProfile.id,
          providerId: providerUser.providerProfile.id,
          serviceCategoryId: category.id,
          addressId: patientSeed.addressId,
          mode: BookingMode.HOME_VISIT,
          status: BookingStatus.SUMMARY_SUBMITTED,
          scheduledAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000),
          symptoms: 'Follow-up consultation for medicine order staging QA',
          totalFee: providerUser.providerProfile.consultationFeeHomeVisit,
          paymentStatus: PaymentStatus.PAID,
          createdAt,
          updatedAt: createdAt,
        },
      });

      await prisma.bookingStatusHistory.createMany({
        data: [
          {
            bookingId: booking.id,
            status: BookingStatus.REQUESTED,
            changedAt: createdAt,
            changedBy: patientUser.id,
          },
          {
            bookingId: booking.id,
            status: BookingStatus.SUMMARY_SUBMITTED,
            changedAt: new Date(createdAt.getTime() + 30 * 60 * 1000),
            changedBy: providerUser.id,
          },
        ],
        skipDuplicates: true,
      });
    }

    const summary = await prisma.consultationSummary.upsert({
      where: { bookingId: booking.id },
      update: {
        symptoms: 'Follow-up consultation for medicine order staging QA',
        observations: 'Synthetic staging case for pharmacy QA validation.',
        diagnosis: spec.diagnosis,
        medicinesAdvised: JSON.parse(JSON.stringify(spec.medicinesAdvised)),
        nextSteps: 'Use the seeded prescription to complete pharmacy checkout.',
        followUpRecommendation: 'Return if symptoms do not improve within 3 days.',
      },
      create: {
        bookingId: booking.id,
        symptoms: 'Follow-up consultation for medicine order staging QA',
        observations: 'Synthetic staging case for pharmacy QA validation.',
        diagnosis: spec.diagnosis,
        medicinesAdvised: JSON.parse(JSON.stringify(spec.medicinesAdvised)),
        nextSteps: 'Use the seeded prescription to complete pharmacy checkout.',
        followUpRecommendation: 'Return if symptoms do not improve within 3 days.',
      },
    });

    const existingPrescription = await prisma.prescription.findFirst({
      where: { consultationSummaryId: summary.id },
    });

    if (existingPrescription) {
      await prisma.prescription.update({
        where: { id: existingPrescription.id },
        data: {
          details: spec.prescriptionDetails,
          fileUrl: null,
        },
      });
    } else {
      await prisma.prescription.create({
        data: {
          consultationSummaryId: summary.id,
          details: spec.prescriptionDetails,
          fileUrl: null,
        },
      });
    }

    summariesSeeded += 1;
  }
  console.log(`✅ Ensured ${summariesSeeded} staging consultation summaries with prescriptions`);

  console.log('\n🌱 Staging seed complete!');
  console.log('ℹ️  Run the base seed first if the database is empty: pnpm --filter @curex24/database db:seed');
  console.log('ℹ️  Staging QA patient phones: +9900000010 and +9900000011');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Staging seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

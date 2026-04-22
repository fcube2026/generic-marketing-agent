/**
 * Dev seed — demo providers for local "Book Service" flow.
 *
 * Creates 4 verified, available providers near MOCK_LOCATION (Delhi),
 * all enabled for Video / Home Visit / Clinic Visit, linked to every
 * existing service category.
 *
 * Run:  pnpm --filter @curex24/database db:seed:dev
 */

import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_PROVIDERS = [
  {
    phone: '+919000000001',
    name: 'Dr. Asha Verma',
    specialization: 'General Medicine',
    clinicAddress: 'Connaught Place, New Delhi',
    lat: 28.6139,
    lng: 77.209,
    fees: { video: 300, home: 700, clinic: 400 },
    radius: 25,
  },
  {
    phone: '+919000000002',
    name: 'Dr. Rohan Mehta',
    specialization: 'Pediatrics',
    clinicAddress: 'Karol Bagh, New Delhi',
    lat: 28.6519,
    lng: 77.1909,
    fees: { video: 350, home: 800, clinic: 450 },
    radius: 20,
  },
  {
    phone: '+919000000003',
    name: 'Dr. Priya Singh',
    specialization: 'Dermatology',
    clinicAddress: 'Saket, New Delhi',
    lat: 28.5245,
    lng: 77.2066,
    fees: { video: 400, home: 900, clinic: 500 },
    radius: 30,
  },
  {
    phone: '+919000000004',
    name: 'Dr. Arjun Kapoor',
    specialization: 'Physiotherapy',
    clinicAddress: 'Dwarka, New Delhi',
    lat: 28.5921,
    lng: 77.046,
    fees: { video: 250, home: 600, clinic: 350 },
    radius: 25,
  },
];

async function main() {
  console.log('🌱 Seeding demo providers for local dev...');

  const categories = await prisma.serviceCategory.findMany();
  if (categories.length === 0) {
    console.error('❌ No service categories found. Run base seed first: pnpm --filter @curex24/database db:seed');
    process.exit(1);
  }

  for (const p of DEMO_PROVIDERS) {
    const user = await prisma.user.upsert({
      where: { phone: p.phone },
      update: { role: Role.PROVIDER },
      create: { phone: p.phone, role: Role.PROVIDER },
    });

    const profile = await prisma.providerProfile.upsert({
      where: { userId: user.id },
      update: {
        name: p.name,
        specialization: p.specialization,
        clinicAddress: p.clinicAddress,
        isVerified: true,
        isActive: true,
        isAvailable: true,
        homeVisitEnabled: true,
        doctorPlaceVisitEnabled: true,
        videoConsultationEnabled: true,
        consultationFeeVideoConsultation: p.fees.video,
        consultationFeeHomeVisit: p.fees.home,
        consultationFeeDoctorPlace: p.fees.clinic,
        currentLat: p.lat,
        currentLng: p.lng,
        serviceRadius: p.radius,
      },
      create: {
        userId: user.id,
        name: p.name,
        specialization: p.specialization,
        contactInfo: p.phone,
        clinicAddress: p.clinicAddress,
        isVerified: true,
        isActive: true,
        isAvailable: true,
        homeVisitEnabled: true,
        doctorPlaceVisitEnabled: true,
        videoConsultationEnabled: true,
        consultationFeeVideoConsultation: p.fees.video,
        consultationFeeHomeVisit: p.fees.home,
        consultationFeeDoctorPlace: p.fees.clinic,
        currentLat: p.lat,
        currentLng: p.lng,
        serviceRadius: p.radius,
      },
    });

    // Link this provider to EVERY service category so any selection returns results
    for (const cat of categories) {
      await prisma.providerService.upsert({
        where: {
          providerId_serviceCategoryId: {
            providerId: profile.id,
            serviceCategoryId: cat.id,
          },
        },
        update: {},
        create: {
          providerId: profile.id,
          serviceCategoryId: cat.id,
        },
      });
    }

    console.log(`   ✅ ${p.name} (${p.specialization}) — linked to ${categories.length} categories`);
  }

  console.log(`✅ Seeded ${DEMO_PROVIDERS.length} demo providers near Delhi (28.6139, 77.2090)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

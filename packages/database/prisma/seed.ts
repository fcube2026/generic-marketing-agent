import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

const serviceCategories = [
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
  {
    name: 'Dermatology',
    slug: 'dermatology',
    description: 'Skin, hair, and nail related conditions',
  },
  {
    name: 'Orthopedics',
    slug: 'orthopedics',
    description: 'Bone, joint, and musculoskeletal care',
  },
  {
    name: 'Cardiology',
    slug: 'cardiology',
    description: 'Heart and cardiovascular system care',
  },
  {
    name: 'ENT',
    slug: 'ent',
    description: 'Ear, nose, and throat specialist care',
  },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Seed service categories
  for (const category of serviceCategories) {
    await prisma.serviceCategory.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description },
      create: category,
    });
  }
  console.log(`✅ Seeded ${serviceCategories.length} service categories`);

  // Seed demo admin user
  const adminUser = await prisma.user.upsert({
    where: { phone: '+0000000000' },
    update: { role: Role.ADMIN },
    create: { phone: '+0000000000', role: Role.ADMIN },
  });
  console.log(`✅ Seeded admin user (id: ${adminUser.id})`);

  // Seed demo provider user with profile
  const providerUser = await prisma.user.upsert({
    where: { phone: '+1111111111' },
    update: { role: Role.PROVIDER },
    create: { phone: '+1111111111', role: Role.PROVIDER },
  });

  await prisma.providerProfile.upsert({
    where: { userId: providerUser.id },
    update: {
      name: 'Dr. Demo Provider',
      specialization: 'General Medicine',
    },
    create: {
      userId: providerUser.id,
      name: 'Dr. Demo Provider',
      specialization: 'General Medicine',
      contactInfo: '+1111111111',
      clinicAddress: '123 Health Street, Medical District',
      homeVisitEnabled: true,
      doctorPlaceVisitEnabled: true,
      isAvailable: true,
      consultationFeeHomeVisit: 500,
      consultationFeeDoctorPlace: 300,
      currentLat: 28.6139,
      currentLng: 77.209,
    },
  });
  console.log(`✅ Seeded provider user with profile (id: ${providerUser.id})`);

  // Seed demo patient user
  const patientUser = await prisma.user.upsert({
    where: { phone: '+2222222222' },
    update: { role: Role.PATIENT },
    create: { phone: '+2222222222', role: Role.PATIENT },
  });
  console.log(`✅ Seeded patient user (id: ${patientUser.id})`);

  console.log('🌱 Seeding complete!');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

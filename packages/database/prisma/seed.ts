import {
  PrismaClient,
  Role,
  BookingMode,
  BookingStatus,
  PaymentStatus,
  PayoutStatus,
  DiagnosticStatus,
  ReferralStatus,
  LicenseStatus,
} from '@prisma/client';

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

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  console.log('🌱 Seeding database...');

  // ── Service categories ────────────────────────────────────────────────────
  const categories: Record<string, { id: string }> = {};
  for (const category of serviceCategories) {
    const cat = await prisma.serviceCategory.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description },
      create: category,
    });
    categories[category.slug] = cat;
  }
  console.log(`✅ Seeded ${serviceCategories.length} service categories`);

  // ── Admin user ────────────────────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { phone: '+0000000000' },
    update: { role: Role.ADMIN },
    create: { phone: '+0000000000', role: Role.ADMIN },
  });
  console.log(`✅ Seeded admin user (id: ${adminUser.id})`);

  // ── Providers ─────────────────────────────────────────────────────────────
  const providerData = [
    {
      phone: '+1111111111',
      name: 'Dr. Arjun Sharma',
      specialization: 'General Medicine',
      contactInfo: '+1111111111',
      clinicAddress: '12 MG Road, Connaught Place, New Delhi',
      isVerified: true,
      isActive: true,
      isAvailable: true,
      homeVisitEnabled: true,
      doctorPlaceVisitEnabled: true,
      consultationFeeHomeVisit: 700,
      consultationFeeDoctorPlace: 400,
      currentLat: 28.6315,
      currentLng: 77.2167,
      licenseType: 'MBBS',
    },
    {
      phone: '+1111111112',
      name: 'Dr. Priya Mehta',
      specialization: 'Pediatrics',
      contactInfo: '+1111111112',
      clinicAddress: '45 Bandra West, Mumbai',
      isVerified: true,
      isActive: true,
      isAvailable: true,
      homeVisitEnabled: true,
      doctorPlaceVisitEnabled: true,
      consultationFeeHomeVisit: 900,
      consultationFeeDoctorPlace: 600,
      currentLat: 19.0596,
      currentLng: 72.8295,
      licenseType: 'MD Pediatrics',
    },
    {
      phone: '+1111111113',
      name: 'Dr. Rohan Verma',
      specialization: 'Cardiology',
      contactInfo: '+1111111113',
      clinicAddress: '8 Koramangala, Bangalore',
      isVerified: true,
      isActive: true,
      isAvailable: false,
      homeVisitEnabled: false,
      doctorPlaceVisitEnabled: true,
      consultationFeeHomeVisit: 0,
      consultationFeeDoctorPlace: 1200,
      currentLat: 12.9352,
      currentLng: 77.6245,
      licenseType: 'DM Cardiology',
    },
    {
      phone: '+1111111114',
      name: 'Dr. Sneha Kapoor',
      specialization: 'Dermatology',
      contactInfo: '+1111111114',
      clinicAddress: '22 Park Street, Kolkata',
      isVerified: false,
      isActive: true,
      isAvailable: false,
      homeVisitEnabled: true,
      doctorPlaceVisitEnabled: true,
      consultationFeeHomeVisit: 800,
      consultationFeeDoctorPlace: 500,
      currentLat: 22.5626,
      currentLng: 88.3510,
      licenseType: 'MD Dermatology',
    },
    {
      phone: '+1111111115',
      name: 'Dr. Vijay Nair',
      specialization: 'Orthopedics',
      contactInfo: '+1111111115',
      clinicAddress: '3 Anna Salai, Chennai',
      isVerified: false,
      isActive: true,
      isAvailable: false,
      homeVisitEnabled: false,
      doctorPlaceVisitEnabled: true,
      consultationFeeHomeVisit: 0,
      consultationFeeDoctorPlace: 1000,
      currentLat: 13.0827,
      currentLng: 80.2707,
      licenseType: 'MS Orthopedics',
    },
  ];

  const providers: { id: string; consultationFeeHomeVisit: number; consultationFeeDoctorPlace: number }[] = [];

  for (const p of providerData) {
    const user = await prisma.user.upsert({
      where: { phone: p.phone },
      update: { role: Role.PROVIDER },
      create: { phone: p.phone, role: Role.PROVIDER },
    });

    const profile = await prisma.providerProfile.upsert({
      where: { userId: user.id },
      update: { name: p.name, specialization: p.specialization, isVerified: p.isVerified, isAvailable: p.isAvailable },
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

    // Add a license for pending providers
    if (!p.isVerified) {
      const existingLicense = await prisma.providerLicense.findFirst({
        where: { providerId: profile.id },
      });
      if (!existingLicense) {
        await prisma.providerLicense.create({
          data: {
            providerId: profile.id,
            type: p.licenseType,
            documentUrl: `https://example.com/licenses/${profile.id}.pdf`,
            status: LicenseStatus.PENDING,
          },
        });
      }
    }

    providers.push({
      id: profile.id,
      consultationFeeHomeVisit: p.consultationFeeHomeVisit,
      consultationFeeDoctorPlace: p.consultationFeeDoctorPlace,
    });
  }
  console.log(`✅ Seeded ${providers.length} providers`);

  // ── Patients ──────────────────────────────────────────────────────────────
  const patientData = [
    { phone: '+2222222221', name: 'Rahul Gupta', dob: '1990-03-15', gender: 'MALE', addressLine: '14 Lajpat Nagar, New Delhi', city: 'New Delhi', state: 'Delhi', pincode: '110024', lat: 28.5679, lng: 77.2436 },
    { phone: '+2222222222', name: 'Sunita Rao', dob: '1985-07-22', gender: 'FEMALE', addressLine: '7 Indiranagar, Bangalore', city: 'Bangalore', state: 'Karnataka', pincode: '560038', lat: 12.9784, lng: 77.6408 },
    { phone: '+2222222223', name: 'Amit Joshi', dob: '1992-11-05', gender: 'MALE', addressLine: '33 Salt Lake, Kolkata', city: 'Kolkata', state: 'West Bengal', pincode: '700091', lat: 22.5831, lng: 88.4140 },
    { phone: '+2222222224', name: 'Kavya Nair', dob: '1995-01-30', gender: 'FEMALE', addressLine: '9 T Nagar, Chennai', city: 'Chennai', state: 'Tamil Nadu', pincode: '600017', lat: 13.0418, lng: 80.2341 },
    { phone: '+2222222225', name: 'Deepak Singh', dob: '1988-09-12', gender: 'MALE', addressLine: '21 Andheri West, Mumbai', city: 'Mumbai', state: 'Maharashtra', pincode: '400058', lat: 19.1197, lng: 72.8468 },
  ];

  const patients: { id: string; userId: string; addressId: string }[] = [];

  for (const p of patientData) {
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
    let addressId: string;
    if (existingAddress) {
      addressId = existingAddress.id;
    } else {
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

    patients.push({ id: profile.id, userId: user.id, addressId });
  }
  console.log(`✅ Seeded ${patients.length} patients`);

  // ── Bookings ──────────────────────────────────────────────────────────────
  // Build a list of bookings to create: [patientIdx, providerIdx, categorySlug, mode, status, daysAgoCreated, fee, paymentStatus]
  type BookingSpec = {
    patientIdx: number;
    providerIdx: number;
    categorySlug: string;
    mode: BookingMode;
    status: BookingStatus;
    daysAgoCreated: number;
    fee: number;
    paymentPaid: boolean;
    withDiagnostic: boolean;
    withReferral: boolean;
    withSummary: boolean;
  };

  const bookingSpecs: BookingSpec[] = [
    // Completed bookings with payments
    { patientIdx: 0, providerIdx: 0, categorySlug: 'general-medicine', mode: BookingMode.HOME_VISIT, status: BookingStatus.COMPLETED, daysAgoCreated: 25, fee: 700, paymentPaid: true, withDiagnostic: true, withReferral: false, withSummary: true },
    { patientIdx: 1, providerIdx: 1, categorySlug: 'pediatrics', mode: BookingMode.HOME_VISIT, status: BookingStatus.COMPLETED, daysAgoCreated: 22, fee: 900, paymentPaid: true, withDiagnostic: false, withReferral: true, withSummary: true },
    { patientIdx: 2, providerIdx: 0, categorySlug: 'general-medicine', mode: BookingMode.DOCTOR_PLACE, status: BookingStatus.CLOSED, daysAgoCreated: 20, fee: 400, paymentPaid: true, withDiagnostic: false, withReferral: false, withSummary: true },
    { patientIdx: 3, providerIdx: 2, categorySlug: 'cardiology', mode: BookingMode.DOCTOR_PLACE, status: BookingStatus.SUMMARY_SUBMITTED, daysAgoCreated: 18, fee: 1200, paymentPaid: true, withDiagnostic: true, withReferral: false, withSummary: true },
    { patientIdx: 4, providerIdx: 1, categorySlug: 'pediatrics', mode: BookingMode.HOME_VISIT, status: BookingStatus.COMPLETED, daysAgoCreated: 15, fee: 900, paymentPaid: true, withDiagnostic: false, withReferral: false, withSummary: true },
    { patientIdx: 0, providerIdx: 2, categorySlug: 'cardiology', mode: BookingMode.DOCTOR_PLACE, status: BookingStatus.COMPLETED, daysAgoCreated: 12, fee: 1200, paymentPaid: true, withDiagnostic: false, withReferral: true, withSummary: true },
    { patientIdx: 1, providerIdx: 0, categorySlug: 'general-medicine', mode: BookingMode.HOME_VISIT, status: BookingStatus.COMPLETED, daysAgoCreated: 10, fee: 700, paymentPaid: true, withDiagnostic: true, withReferral: false, withSummary: true },
    { patientIdx: 2, providerIdx: 1, categorySlug: 'pediatrics', mode: BookingMode.DOCTOR_PLACE, status: BookingStatus.COMPLETED, daysAgoCreated: 7, fee: 600, paymentPaid: true, withDiagnostic: false, withReferral: false, withSummary: true },
    { patientIdx: 3, providerIdx: 0, categorySlug: 'general-medicine', mode: BookingMode.HOME_VISIT, status: BookingStatus.COMPLETED, daysAgoCreated: 5, fee: 700, paymentPaid: true, withDiagnostic: false, withReferral: false, withSummary: true },
    { patientIdx: 4, providerIdx: 2, categorySlug: 'cardiology', mode: BookingMode.DOCTOR_PLACE, status: BookingStatus.CLOSED, daysAgoCreated: 3, fee: 1200, paymentPaid: true, withDiagnostic: false, withReferral: false, withSummary: true },
    // Cancelled bookings
    { patientIdx: 0, providerIdx: 1, categorySlug: 'pediatrics', mode: BookingMode.HOME_VISIT, status: BookingStatus.CANCELLED, daysAgoCreated: 14, fee: 900, paymentPaid: false, withDiagnostic: false, withReferral: false, withSummary: false },
    { patientIdx: 2, providerIdx: 2, categorySlug: 'cardiology', mode: BookingMode.DOCTOR_PLACE, status: BookingStatus.CANCELLED, daysAgoCreated: 8, fee: 1200, paymentPaid: false, withDiagnostic: false, withReferral: false, withSummary: false },
    { patientIdx: 4, providerIdx: 0, categorySlug: 'general-medicine', mode: BookingMode.HOME_VISIT, status: BookingStatus.CANCELLED, daysAgoCreated: 4, fee: 700, paymentPaid: false, withDiagnostic: false, withReferral: false, withSummary: false },
    // Active bookings
    { patientIdx: 1, providerIdx: 0, categorySlug: 'general-medicine', mode: BookingMode.HOME_VISIT, status: BookingStatus.ACCEPTED, daysAgoCreated: 1, fee: 700, paymentPaid: true, withDiagnostic: false, withReferral: false, withSummary: false },
    { patientIdx: 3, providerIdx: 1, categorySlug: 'pediatrics', mode: BookingMode.DOCTOR_PLACE, status: BookingStatus.REQUESTED, daysAgoCreated: 0, fee: 600, paymentPaid: false, withDiagnostic: false, withReferral: false, withSummary: false },
    { patientIdx: 4, providerIdx: 2, categorySlug: 'cardiology', mode: BookingMode.DOCTOR_PLACE, status: BookingStatus.IN_PROGRESS, daysAgoCreated: 0, fee: 1200, paymentPaid: true, withDiagnostic: false, withReferral: false, withSummary: false },
  ];

  let bookingsCreated = 0;
  for (const spec of bookingSpecs) {
    const patient = patients[spec.patientIdx];
    const provider = providers[spec.providerIdx];
    const category = categories[spec.categorySlug];
    const createdAt = daysAgo(spec.daysAgoCreated);
    const scheduledAt = new Date(createdAt.getTime() + 2 * 60 * 60 * 1000); // 2 hours after creation

    const booking = await prisma.booking.create({
      data: {
        patientId: patient.id,
        providerId: provider.id,
        serviceCategoryId: category.id,
        addressId: spec.mode === BookingMode.HOME_VISIT ? patient.addressId : null,
        mode: spec.mode,
        status: spec.status,
        scheduledAt,
        symptoms: 'Routine checkup and general consultation',
        totalFee: spec.fee,
        paymentStatus: spec.paymentPaid ? PaymentStatus.PAID : PaymentStatus.PENDING,
        createdAt,
        updatedAt: createdAt,
      },
    });

    // Status history
    await prisma.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        status: BookingStatus.REQUESTED,
        changedAt: createdAt,
        changedBy: patient.userId,
      },
    });
    if (spec.status !== BookingStatus.REQUESTED && spec.status !== BookingStatus.CANCELLED) {
      await prisma.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          status: spec.status,
          changedAt: new Date(createdAt.getTime() + 30 * 60 * 1000),
          changedBy: provider.id,
        },
      });
    }

    // Payment
    if (spec.paymentPaid) {
      const paidAt = new Date(createdAt.getTime() + 10 * 60 * 1000);
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: spec.fee,
          status: PaymentStatus.PAID,
          transactionId: `TXN-${booking.id.slice(-8).toUpperCase()}`,
          paidAt,
          createdAt,
          updatedAt: paidAt,
        },
      });

      // Payout (80% of fee) for completed bookings
      if (([BookingStatus.COMPLETED, BookingStatus.SUMMARY_SUBMITTED, BookingStatus.CLOSED] as string[]).includes(spec.status)) {
        await prisma.payout.create({
          data: {
            providerId: provider.id,
            bookingId: booking.id,
            amount: Math.round(spec.fee * 0.8),
            status: PayoutStatus.PENDING,
            createdAt,
          },
        });
      }
    }

    // Consultation summary
    if (spec.withSummary) {
      const summary = await prisma.consultationSummary.create({
        data: {
          bookingId: booking.id,
          symptoms: 'Patient reported mild fever and fatigue',
          observations: 'Vitals normal. Slight throat redness observed.',
          diagnosis: 'Viral upper respiratory infection',
          medicinesAdvised: [{ name: 'Paracetamol 500mg', dosage: '1 tablet twice daily for 3 days' }],
          nextSteps: 'Rest and adequate hydration. Return if symptoms worsen.',
          followUpRecommendation: 'Follow up in 5 days if not improved',
        },
      });

      await prisma.prescription.create({
        data: {
          consultationSummaryId: summary.id,
          details: 'Paracetamol 500mg – twice daily for 3 days. Cetirizine 10mg – once at night.',
          fileUrl: null,
        },
      });
    }

    // Diagnostic request
    if (spec.withDiagnostic) {
      const diagReq = await prisma.diagnosticRequest.create({
        data: {
          bookingId: booking.id,
          testType: 'Complete Blood Count',
          notes: 'Check for infection markers',
          status: DiagnosticStatus.RESULTED,
          scheduledAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000),
          createdAt,
          updatedAt: new Date(createdAt.getTime() + 48 * 60 * 60 * 1000),
        },
      });

      await prisma.labResult.create({
        data: {
          diagnosticRequestId: diagReq.id,
          resultFileUrl: `https://example.com/lab-results/${diagReq.id}.pdf`,
          notes: 'All values within normal range',
          uploadedAt: new Date(createdAt.getTime() + 48 * 60 * 60 * 1000),
        },
      });
    }

    // Referral
    if (spec.withReferral) {
      await prisma.referral.create({
        data: {
          bookingId: booking.id,
          specialistType: 'Pulmonologist',
          notes: 'Referred for further evaluation of chronic cough',
          status: ReferralStatus.RECOMMENDED,
          createdAt,
          updatedAt: createdAt,
        },
      });
    }

    bookingsCreated++;
  }
  console.log(`✅ Seeded ${bookingsCreated} bookings with payments, payouts, diagnostics, and referrals`);

  // ─── Marketing seed data ──────────────────────────────────────────────────
  await seedMarketing();

  console.log('🌱 Seeding complete!');
}

async function seedMarketing() {
  console.log('🌱 Seeding marketing data...');

  // Business profile (singleton)
  await prisma.marketingBusinessProfile.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      primaryGrowthFocus: 'both',
      biggestBottleneck: 'demand',
      monthlyBudget: 500000,
      allocatedBudget: 200000,
      targetCities: ['Mumbai', 'Delhi', 'Bengaluru'],
      bestPerforming: 'Word-of-mouth and referrals',
      topPatientPersona: 'Urban Busy Professional (25–40)',
      topReasonPatientChooses: 'Speed and convenience of home visits',
      topReasonProviderJoins: 'Steady patient flow without marketing effort',
      competitors: ['Practo', 'PharmEasy', 'DocsApp'],
      founderLedBrand: true,
    },
    update: {},
  });

  // Sample campaign
  await prisma.marketingCampaign.upsert({
    where: { id: 'seed-campaign-1' },
    create: {
      id: 'seed-campaign-1',
      name: 'Mumbai Patient Acquisition — Spring 2026',
      objective: 'Drive 500 new patient signups in Mumbai',
      channel: 'Meta Ads + Google Search',
      audience: 'Urban professionals 25–40, Mumbai metro',
      budget: '₹2L',
      duration: '4 weeks',
      kpi: 'CAC < ₹300, signup → first booking > 30%',
      status: 'active',
      headline: ['See a doctor at home in 30 minutes', 'No more clinic queues'],
      description: ['Verified GPs and specialists', 'Home visit ₹499 onwards'],
      spend: 60000,
      impressions: 240000,
      conversions: 180,
    },
    update: {},
  });

  // Sample experiment
  await prisma.marketingExperiment.upsert({
    where: { id: 'seed-exp-1' },
    create: {
      id: 'seed-exp-1',
      name: 'Landing hero copy: benefit vs feature',
      hypothesis: 'Benefit-led headline lifts booking-start rate',
      channel: 'Web — Mumbai LP',
      control: 'Feature: "GPs, specialists, home visits"',
      variant: 'Benefit: "See a doctor at home in 30 minutes"',
      metric: 'Booking start rate',
      startDate: '2026-04-01',
      endDate: '2026-04-15',
      status: 'completed',
      result: 'Variant +14% booking starts',
      winner: 'variant',
      lift: '+14%',
    },
    update: {},
  });

  // Sample content item
  await prisma.marketingContentItem.upsert({
    where: { id: 'seed-content-1' },
    create: {
      id: 'seed-content-1',
      week: 1,
      day: 'Mon',
      platform: 'Instagram',
      pillar: 'patient-education',
      title: '5 signs your child needs a paediatrician home visit',
      format: 'Carousel',
      status: 'published',
    },
    update: {},
  });

  // Sample SEO page
  await prisma.marketingSeoPage.upsert({
    where: { url: '/mumbai/general-physician' },
    create: {
      url: '/mumbai/general-physician',
      type: 'city-specialty',
      title: 'General Physician in Mumbai — Home Visit | curex24',
      status: 'live',
      targetKeyword: 'general physician mumbai home visit',
    },
    update: {},
  });

  // Sample keyword cluster
  await prisma.marketingKeywordCluster.upsert({
    where: { id: 'seed-cluster-1' },
    create: {
      id: 'seed-cluster-1',
      cluster: 'home doctor visit',
      type: 'transactional',
      priority: 'high',
      keywords: [
        { keyword: 'home doctor visit mumbai', volume: '4.4K', difficulty: 'Medium' },
        { keyword: 'doctor at home delhi', volume: '3.6K', difficulty: 'Medium' },
        { keyword: 'home visit doctor near me', volume: '8.1K', difficulty: 'High' },
      ],
    },
    update: {},
  });

  // Sample lifecycle flow
  await prisma.marketingLifecycleFlow.upsert({
    where: { id: 'seed-flow-1' },
    create: {
      id: 'seed-flow-1',
      name: 'Patient onboarding (D0–D7)',
      segment: 'patient',
      trigger: 'User signup',
      status: 'active',
      steps: {
        create: [
          { day: 0, channel: 'Email', message: 'Welcome to curex24 — book your first home visit', goal: 'First booking', order: 0 },
          { day: 2, channel: 'Push', message: 'Still deciding? Browse top-rated GPs in your area', goal: 'Activate', order: 1 },
          { day: 5, channel: 'SMS', message: '₹100 off your first booking — code WELCOME100', goal: 'Conversion', order: 2 },
        ],
      },
    },
    update: {},
  });

  // Sample plan items
  const planItems = [
    { id: 'seed-plan-1', phase: '1-30', category: 'Foundation', task: 'Complete business intake (Tier 1)', owner: 'Founder', done: true },
    { id: 'seed-plan-2', phase: '1-30', category: 'Acquisition', task: 'Launch Meta Ads in Mumbai (₹2L test)', owner: 'Growth', done: true },
    { id: 'seed-plan-3', phase: '31-60', category: 'Activation', task: 'Ship onboarding lifecycle email flow', owner: 'CRM', done: false },
    { id: 'seed-plan-4', phase: '61-90', category: 'Retention', task: 'Launch referral program v1', owner: 'Growth', done: false },
  ];
  for (const item of planItems) {
    await prisma.marketingPlanItem.upsert({
      where: { id: item.id },
      create: item,
      update: {},
    });
  }

  console.log('✅ Marketing seed data inserted');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

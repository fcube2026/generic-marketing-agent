import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import {
  BookingMode,
  BookingStatus,
  DiagnosticStatus,
  LicenseStatus,
  PaymentStatus,
  PayoutStatus,
  ReferralStatus,
  Role,
} from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class BootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(private prisma: PrismaService) {}

  async onApplicationBootstrap() {
    // Fire-and-forget: do NOT await so the HTTP server can start immediately
    // and pass the Railway healthcheck while the seed runs in the background.
    this.runSeedIfNeeded();
  }

  private async runSeedIfNeeded() {
    try {
      const bookingCount = await this.prisma.booking.count();
      if (bookingCount === 0) {
        this.logger.log(
          'Database appears empty — running seed to populate dummy data...',
        );
        await this.seed();
        this.logger.log('Seed complete');
      } else {
        this.logger.log(
          `Database already has ${bookingCount} booking(s) — skipping seed`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Bootstrap seed check failed: ${(err as Error).message}`,
      );
    }
  }

  // ─── helpers ────────────────────────────────────────────────────────────────

  private readonly PAYOUT_ELIGIBLE_STATUSES: BookingStatus[] = [
    BookingStatus.COMPLETED,
    BookingStatus.SUMMARY_SUBMITTED,
    BookingStatus.CLOSED,
  ];

  private daysAgo(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
  }

  private async seed() {
    // Service categories
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
        name: 'Cardiology',
        slug: 'cardiology',
        description: 'Heart and cardiovascular system care',
      },
    ];

    const categories: Record<string, string> = {};
    for (const cat of serviceCategories) {
      const record = await this.prisma.serviceCategory.upsert({
        where: { slug: cat.slug },
        update: { name: cat.name, description: cat.description },
        create: cat,
      });
      categories[cat.slug] = record.id;
    }

    // Admin user
    await this.prisma.user.upsert({
      where: { phone: '+0000000000' },
      update: { role: Role.ADMIN },
      create: { phone: '+0000000000', role: Role.ADMIN },
    });

    // Providers
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
        currentLng: 88.351,
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

    const providers: { id: string; feeHome: number; feeCli: number }[] = [];
    for (const p of providerData) {
      const user = await this.prisma.user.upsert({
        where: { phone: p.phone },
        update: { role: Role.PROVIDER },
        create: { phone: p.phone, role: Role.PROVIDER },
      });
      const profile = await this.prisma.providerProfile.upsert({
        where: { userId: user.id },
        update: {
          name: p.name,
          specialization: p.specialization,
          isVerified: p.isVerified,
          isAvailable: p.isAvailable,
        },
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
      if (!p.isVerified) {
        const existing = await this.prisma.providerLicense.findFirst({
          where: { providerId: profile.id },
        });
        if (!existing) {
          await this.prisma.providerLicense.create({
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
        feeHome: p.consultationFeeHomeVisit,
        feeCli: p.consultationFeeDoctorPlace,
      });
    }

    // Patients
    const patientData = [
      {
        phone: '+2222222221',
        name: 'Rahul Gupta',
        dob: '1990-03-15',
        gender: 'MALE',
        addressLine: '14 Lajpat Nagar, New Delhi',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110024',
        lat: 28.5679,
        lng: 77.2436,
      },
      {
        phone: '+2222222222',
        name: 'Sunita Rao',
        dob: '1985-07-22',
        gender: 'FEMALE',
        addressLine: '7 Indiranagar, Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560038',
        lat: 12.9784,
        lng: 77.6408,
      },
      {
        phone: '+2222222223',
        name: 'Amit Joshi',
        dob: '1992-11-05',
        gender: 'MALE',
        addressLine: '33 Salt Lake, Kolkata',
        city: 'Kolkata',
        state: 'West Bengal',
        pincode: '700091',
        lat: 22.5831,
        lng: 88.414,
      },
      {
        phone: '+2222222224',
        name: 'Kavya Nair',
        dob: '1995-01-30',
        gender: 'FEMALE',
        addressLine: '9 T Nagar, Chennai',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600017',
        lat: 13.0418,
        lng: 80.2341,
      },
      {
        phone: '+2222222225',
        name: 'Deepak Singh',
        dob: '1988-09-12',
        gender: 'MALE',
        addressLine: '21 Andheri West, Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400058',
        lat: 19.1197,
        lng: 72.8468,
      },
    ];

    const patients: { id: string; userId: string; addressId: string }[] = [];
    for (const p of patientData) {
      const user = await this.prisma.user.upsert({
        where: { phone: p.phone },
        update: { role: Role.PATIENT },
        create: { phone: p.phone, role: Role.PATIENT },
      });
      const profile = await this.prisma.patientProfile.upsert({
        where: { userId: user.id },
        update: { name: p.name },
        create: {
          userId: user.id,
          name: p.name,
          dateOfBirth: new Date(`${p.dob}T00:00:00.000Z`),
          gender: p.gender,
        },
      });
      const existingAddress = await this.prisma.address.findFirst({
        where: { userId: user.id },
      });
      let addressId: string;
      if (existingAddress) {
        addressId = existingAddress.id;
      } else {
        const address = await this.prisma.address.create({
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

    // Bookings
    type BookingSpec = {
      pi: number;
      ri: number;
      cat: string;
      mode: BookingMode;
      status: BookingStatus;
      ago: number;
      fee: number;
      paid: boolean;
      diag: boolean;
      ref: boolean;
      summary: boolean;
    };
    const specs: BookingSpec[] = [
      {
        pi: 0,
        ri: 0,
        cat: 'general-medicine',
        mode: BookingMode.HOME_VISIT,
        status: BookingStatus.COMPLETED,
        ago: 25,
        fee: 700,
        paid: true,
        diag: true,
        ref: false,
        summary: true,
      },
      {
        pi: 1,
        ri: 1,
        cat: 'pediatrics',
        mode: BookingMode.HOME_VISIT,
        status: BookingStatus.COMPLETED,
        ago: 22,
        fee: 900,
        paid: true,
        diag: false,
        ref: true,
        summary: true,
      },
      {
        pi: 2,
        ri: 0,
        cat: 'general-medicine',
        mode: BookingMode.DOCTOR_PLACE,
        status: BookingStatus.CLOSED,
        ago: 20,
        fee: 400,
        paid: true,
        diag: false,
        ref: false,
        summary: true,
      },
      {
        pi: 3,
        ri: 2,
        cat: 'cardiology',
        mode: BookingMode.DOCTOR_PLACE,
        status: BookingStatus.SUMMARY_SUBMITTED,
        ago: 18,
        fee: 1200,
        paid: true,
        diag: true,
        ref: false,
        summary: true,
      },
      {
        pi: 4,
        ri: 1,
        cat: 'pediatrics',
        mode: BookingMode.HOME_VISIT,
        status: BookingStatus.COMPLETED,
        ago: 15,
        fee: 900,
        paid: true,
        diag: false,
        ref: false,
        summary: true,
      },
      {
        pi: 0,
        ri: 2,
        cat: 'cardiology',
        mode: BookingMode.DOCTOR_PLACE,
        status: BookingStatus.COMPLETED,
        ago: 12,
        fee: 1200,
        paid: true,
        diag: false,
        ref: true,
        summary: true,
      },
      {
        pi: 1,
        ri: 0,
        cat: 'general-medicine',
        mode: BookingMode.HOME_VISIT,
        status: BookingStatus.COMPLETED,
        ago: 10,
        fee: 700,
        paid: true,
        diag: true,
        ref: false,
        summary: true,
      },
      {
        pi: 2,
        ri: 1,
        cat: 'pediatrics',
        mode: BookingMode.DOCTOR_PLACE,
        status: BookingStatus.COMPLETED,
        ago: 7,
        fee: 600,
        paid: true,
        diag: false,
        ref: false,
        summary: true,
      },
      {
        pi: 3,
        ri: 0,
        cat: 'general-medicine',
        mode: BookingMode.HOME_VISIT,
        status: BookingStatus.COMPLETED,
        ago: 5,
        fee: 700,
        paid: true,
        diag: false,
        ref: false,
        summary: true,
      },
      {
        pi: 4,
        ri: 2,
        cat: 'cardiology',
        mode: BookingMode.DOCTOR_PLACE,
        status: BookingStatus.CLOSED,
        ago: 3,
        fee: 1200,
        paid: true,
        diag: false,
        ref: false,
        summary: true,
      },
      {
        pi: 0,
        ri: 1,
        cat: 'pediatrics',
        mode: BookingMode.HOME_VISIT,
        status: BookingStatus.CANCELLED,
        ago: 14,
        fee: 900,
        paid: false,
        diag: false,
        ref: false,
        summary: false,
      },
      {
        pi: 2,
        ri: 2,
        cat: 'cardiology',
        mode: BookingMode.DOCTOR_PLACE,
        status: BookingStatus.CANCELLED,
        ago: 8,
        fee: 1200,
        paid: false,
        diag: false,
        ref: false,
        summary: false,
      },
      {
        pi: 4,
        ri: 0,
        cat: 'general-medicine',
        mode: BookingMode.HOME_VISIT,
        status: BookingStatus.CANCELLED,
        ago: 4,
        fee: 700,
        paid: false,
        diag: false,
        ref: false,
        summary: false,
      },
      {
        pi: 1,
        ri: 0,
        cat: 'general-medicine',
        mode: BookingMode.HOME_VISIT,
        status: BookingStatus.ACCEPTED,
        ago: 1,
        fee: 700,
        paid: true,
        diag: false,
        ref: false,
        summary: false,
      },
      {
        pi: 3,
        ri: 1,
        cat: 'pediatrics',
        mode: BookingMode.DOCTOR_PLACE,
        status: BookingStatus.REQUESTED,
        ago: 0,
        fee: 600,
        paid: false,
        diag: false,
        ref: false,
        summary: false,
      },
      {
        pi: 4,
        ri: 2,
        cat: 'cardiology',
        mode: BookingMode.DOCTOR_PLACE,
        status: BookingStatus.IN_PROGRESS,
        ago: 0,
        fee: 1200,
        paid: true,
        diag: false,
        ref: false,
        summary: false,
      },
    ];

    for (const s of specs) {
      const patient = patients[s.pi];
      const provider = providers[s.ri];
      const catId = categories[s.cat];
      const createdAt = this.daysAgo(s.ago);
      const scheduledAt = new Date(createdAt.getTime() + 2 * 60 * 60 * 1000);

      const booking = await this.prisma.booking.create({
        data: {
          patientId: patient.id,
          providerId: provider.id,
          serviceCategoryId: catId,
          addressId:
            s.mode === BookingMode.HOME_VISIT ? patient.addressId : null,
          mode: s.mode,
          status: s.status,
          scheduledAt,
          symptoms: 'Routine checkup and general consultation',
          totalFee: s.fee,
          paymentStatus: s.paid ? PaymentStatus.PAID : PaymentStatus.PENDING,
          createdAt,
          updatedAt: createdAt,
        },
      });

      await this.prisma.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          status: BookingStatus.REQUESTED,
          changedAt: createdAt,
          changedBy: patient.userId,
        },
      });
      if (
        s.status !== BookingStatus.REQUESTED &&
        s.status !== BookingStatus.CANCELLED
      ) {
        await this.prisma.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            status: s.status,
            changedAt: new Date(createdAt.getTime() + 30 * 60 * 1000),
            changedBy: provider.id,
          },
        });
      }

      if (s.paid) {
        const paidAt = new Date(createdAt.getTime() + 10 * 60 * 1000);
        await this.prisma.payment.create({
          data: {
            bookingId: booking.id,
            amount: s.fee,
            status: PaymentStatus.PAID,
            transactionId: `TXN-${booking.id.slice(-8).toUpperCase()}`,
            paidAt,
            createdAt,
            updatedAt: paidAt,
          },
        });
        if (this.PAYOUT_ELIGIBLE_STATUSES.includes(s.status)) {
          await this.prisma.payout.create({
            data: {
              providerId: provider.id,
              bookingId: booking.id,
              amount: Math.round(s.fee * 0.8),
              status: PayoutStatus.PENDING,
              createdAt,
            },
          });
        }
      }

      if (s.summary) {
        const summary = await this.prisma.consultationSummary.create({
          data: {
            bookingId: booking.id,
            symptoms: 'Patient reported mild fever and fatigue',
            observations: 'Vitals normal. Slight throat redness observed.',
            diagnosis: 'Viral upper respiratory infection',
            medicinesAdvised: [
              {
                name: 'Paracetamol 500mg',
                dosage: '1 tablet twice daily for 3 days',
              },
            ],
            nextSteps:
              'Rest and adequate hydration. Return if symptoms worsen.',
            followUpRecommendation: 'Follow up in 5 days if not improved',
          },
        });
        await this.prisma.prescription.create({
          data: {
            consultationSummaryId: summary.id,
            details:
              'Paracetamol 500mg – twice daily for 3 days. Cetirizine 10mg – once at night.',
            fileUrl: null,
          },
        });
      }

      if (s.diag) {
        const diagReq = await this.prisma.diagnosticRequest.create({
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
        await this.prisma.labResult.create({
          data: {
            diagnosticRequestId: diagReq.id,
            resultFileUrl: `https://example.com/lab-results/${diagReq.id}.pdf`,
            notes: 'All values within normal range',
            uploadedAt: new Date(createdAt.getTime() + 48 * 60 * 60 * 1000),
          },
        });
      }

      if (s.ref) {
        await this.prisma.referral.create({
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
    }
  }
}

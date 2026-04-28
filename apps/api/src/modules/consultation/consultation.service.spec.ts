import { Test, TestingModule } from '@nestjs/testing';
import { ConsultationService } from './consultation.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrescriptionStorageService } from '../prescription/prescription-storage.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

describe('ConsultationService', () => {
  let service: ConsultationService;
  let prisma: PrismaService;
  let _notificationsService: NotificationsService;

  const mockBooking = {
    id: 'booking-1',
    status: 'COMPLETED',
    providerId: 'provider-1',
    provider: { id: 'provider-1', userId: 'user-provider-1' },
  };

  const mockSummary = {
    id: 'summary-1',
    bookingId: 'booking-1',
    symptoms: 'Fever and cough',
    observations: 'Temperature 101F',
    diagnosis: 'Viral infection',
    medicinesAdvised: null,
    nextSteps: 'Rest and fluids',
    followUpRecommendation: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockNotificationsService = {
    sendNotification: jest.fn().mockResolvedValue({ success: true }),
  };

  const mockPrescriptionStorageService = {
    uploadFile: jest.fn().mockResolvedValue('patient-1/consultation-booking-1'),
    getSignedUrl: jest
      .fn()
      .mockResolvedValue('https://supabase.example.com/consultation-booking-1'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultationService,
        {
          provide: PrismaService,
          useValue: {
            booking: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            consultationSummary: {
              upsert: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
            prescription: {
              create: jest.fn(),
            },
            bookingStatusHistory: {
              create: jest.fn(),
            },
            pharmacyOrder: {
              findFirst: jest.fn(),
            },
            patientProfile: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: PrescriptionStorageService,
          useValue: mockPrescriptionStorageService,
        },
      ],
    }).compile();

    service = module.get<ConsultationService>(ConsultationService);
    prisma = module.get<PrismaService>(PrismaService);
    _notificationsService =
      module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSummary', () => {
    const dto = {
      symptoms: 'Fever and cough',
      diagnosis: 'Viral infection',
      observations: 'Temperature 101F',
      nextSteps: 'Rest and fluids',
    };

    it('should create summary and transition booking to SUMMARY_SUBMITTED', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
      (prisma.consultationSummary.upsert as jest.Mock).mockResolvedValue(
        mockSummary,
      );
      (prisma.booking.update as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: 'SUMMARY_SUBMITTED',
      });
      (prisma.bookingStatusHistory.create as jest.Mock).mockResolvedValue({});

      const result = await service.createSummary(
        'booking-1',
        'user-provider-1',
        dto,
      );

      expect(result).toEqual(mockSummary);
      expect(prisma.consultationSummary.upsert).toHaveBeenCalledWith({
        where: { bookingId: 'booking-1' },
        create: expect.objectContaining({
          bookingId: 'booking-1',
          symptoms: 'Fever and cough',
          diagnosis: 'Viral infection',
        }),
        update: expect.objectContaining({
          symptoms: 'Fever and cough',
          diagnosis: 'Viral infection',
        }),
      });
      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: { status: 'SUMMARY_SUBMITTED' },
      });
      expect(prisma.bookingStatusHistory.create).toHaveBeenCalledWith({
        data: {
          bookingId: 'booking-1',
          status: 'SUMMARY_SUBMITTED',
          changedBy: 'user-provider-1',
        },
      });
    });

    it('should throw NotFoundException when booking does not exist', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createSummary('nonexistent', 'user-provider-1', dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the assigned provider', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);

      await expect(
        service.createSummary('booking-1', 'user-other', dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when booking is not in COMPLETED or IN_PROGRESS status', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: 'REQUESTED',
      });

      await expect(
        service.createSummary('booking-1', 'user-provider-1', dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow summary submission when booking is IN_PROGRESS', async () => {
      const inProgressBooking = { ...mockBooking, status: 'IN_PROGRESS' };
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(
        inProgressBooking,
      );
      (prisma.consultationSummary.upsert as jest.Mock).mockResolvedValue(
        mockSummary,
      );
      (prisma.booking.update as jest.Mock).mockResolvedValue({
        ...inProgressBooking,
        status: 'SUMMARY_SUBMITTED',
      });
      (prisma.bookingStatusHistory.create as jest.Mock).mockResolvedValue({});

      const result = await service.createSummary(
        'booking-1',
        'user-provider-1',
        dto,
      );

      expect(result).toEqual(mockSummary);
    });

    it('should allow updating summary when booking is already SUMMARY_SUBMITTED', async () => {
      const submittedBooking = { ...mockBooking, status: 'SUMMARY_SUBMITTED' };
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(
        submittedBooking,
      );
      (prisma.consultationSummary.upsert as jest.Mock).mockResolvedValue(
        mockSummary,
      );

      const result = await service.createSummary(
        'booking-1',
        'user-provider-1',
        dto,
      );

      expect(result).toEqual(mockSummary);
      expect(prisma.booking.update).not.toHaveBeenCalled();
      expect(prisma.bookingStatusHistory.create).not.toHaveBeenCalled();
    });

    it('should reject summary when booking is already CLOSED', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: 'CLOSED',
      });

      await expect(
        service.createSummary('booking-1', 'user-provider-1', dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSummary', () => {
    it('should return consultation summary with derived prescriptionUrl and order metadata', async () => {
      const summaryWithPrescriptions = {
        ...mockSummary,
        prescriptions: [
          { id: 'rx-1', fileUrl: 'https://files/x.pdf', createdAt: new Date() },
        ],
      };
      (prisma.consultationSummary.findUnique as jest.Mock).mockResolvedValue(
        summaryWithPrescriptions,
      );
      (prisma.pharmacyOrder.findFirst as jest.Mock).mockResolvedValue({
        id: 'order-1',
      });

      const result = await service.getSummary('booking-1');

      expect(result).toEqual({
        ...summaryWithPrescriptions,
        prescriptionUrl: 'https://files/x.pdf',
        hasOrder: true,
        orderId: 'order-1',
      });
      expect(prisma.consultationSummary.findUnique).toHaveBeenCalledWith({
        where: { bookingId: 'booking-1' },
        include: {
          prescriptions: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    });

    it('should throw NotFoundException when summary does not exist', async () => {
      (prisma.consultationSummary.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.getSummary('booking-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPatientSummaries', () => {
    const mockPatientProfile = { id: 'patient-1', userId: 'user-patient-1' };
    const mockSummaries = [
      {
        ...mockSummary,
        prescriptions: [],
        booking: {
          id: 'booking-1',
          provider: { id: 'provider-1', name: 'Dr. Smith' },
          serviceCategory: { id: 'cat-1', name: 'General' },
        },
      },
    ];

    it('should return paginated summaries for a patient', async () => {
      (prisma.patientProfile.findUnique as jest.Mock).mockResolvedValue(
        mockPatientProfile,
      );
      (prisma.consultationSummary.findMany as jest.Mock).mockResolvedValue(
        mockSummaries,
      );
      (prisma.consultationSummary.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getPatientSummaries('user-patient-1', 1, 10);

      expect(result).toEqual({
        data: mockSummaries,
        total: 1,
        page: 1,
        limit: 10,
      });
      expect(prisma.consultationSummary.findMany).toHaveBeenCalledWith({
        where: { booking: { patientId: 'patient-1' } },
        include: {
          prescriptions: true,
          booking: {
            include: {
              provider: true,
              serviceCategory: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('should return empty result when patient profile does not exist', async () => {
      (prisma.patientProfile.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getPatientSummaries('user-unknown', 1, 10);

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 10 });
    });

    it('should handle pagination correctly', async () => {
      (prisma.patientProfile.findUnique as jest.Mock).mockResolvedValue(
        mockPatientProfile,
      );
      (prisma.consultationSummary.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.consultationSummary.count as jest.Mock).mockResolvedValue(15);

      const result = await service.getPatientSummaries('user-patient-1', 2, 10);

      expect(result).toEqual({ data: [], total: 15, page: 2, limit: 10 });
      expect(prisma.consultationSummary.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  describe('getLatestForPatient', () => {
    const mockPatientProfile = { id: 'patient-1', userId: 'user-patient-1' };

    it('returns the latest consultation shaped for "Use Recent Prescription"', async () => {
      (prisma.patientProfile.findUnique as jest.Mock).mockResolvedValue(
        mockPatientProfile,
      );
      const createdAt = new Date('2025-01-15T10:00:00Z');
      const medicines = [
        {
          name: 'Paracetamol 500mg',
          dosage: '1 tab',
          frequency: 'TID',
          duration: '5 days',
        },
      ];
      (prisma.consultationSummary.findFirst as jest.Mock).mockResolvedValue({
        id: 'summary-9',
        bookingId: 'booking-9',
        medicinesAdvised: medicines,
        createdAt,
        prescriptions: [
          { id: 'rx-1', fileUrl: 'https://files/x.pdf', createdAt },
        ],
      });

      const result = await service.getLatestForPatient('user-patient-1');

      expect(result).toEqual({
        consultationId: 'summary-9',
        createdAt,
        medicines,
        prescriptionUrl: 'https://files/x.pdf',
      });
      expect(prisma.consultationSummary.findFirst).toHaveBeenCalledWith({
        where: { booking: { patientId: 'patient-1' } },
        orderBy: { createdAt: 'desc' },
        include: {
          prescriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
    });

    it('returns null when patient profile does not exist', async () => {
      (prisma.patientProfile.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getLatestForPatient('user-unknown');

      expect(result).toBeNull();
      expect(prisma.consultationSummary.findFirst).not.toHaveBeenCalled();
    });

    it('returns null when the patient has no consultation summaries yet', async () => {
      (prisma.patientProfile.findUnique as jest.Mock).mockResolvedValue(
        mockPatientProfile,
      );
      (prisma.consultationSummary.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await service.getLatestForPatient('user-patient-1');

      expect(result).toBeNull();
    });

    it('returns medicines=[] and prescriptionUrl=null when none recorded', async () => {
      (prisma.patientProfile.findUnique as jest.Mock).mockResolvedValue(
        mockPatientProfile,
      );
      const createdAt = new Date('2025-01-15T10:00:00Z');
      (prisma.consultationSummary.findFirst as jest.Mock).mockResolvedValue({
        id: 'summary-1',
        bookingId: 'booking-1',
        medicinesAdvised: null,
        createdAt,
        prescriptions: [],
      });

      const result = await service.getLatestForPatient('user-patient-1');

      expect(result).toEqual({
        consultationId: 'summary-1',
        createdAt,
        medicines: [],
        prescriptionUrl: null,
      });
    });
  });

  describe('addPrescription', () => {
    const bookingWithSummary = {
      id: 'booking-1',
      provider: {
        id: 'provider-1',
        userId: 'user-provider-1',
        name: 'Dr. Smith',
      },
      patient: {
        id: 'patient-1',
        userId: 'user-patient-1',
        user: { id: 'user-patient-1' },
      },
      consultationSummary: { id: 'summary-1' },
    };

    it('adds a prescription for provider-owned booking', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(
        bookingWithSummary,
      );
      (prisma.prescription.create as jest.Mock).mockResolvedValue({
        id: 'rx-1',
        consultationSummaryId: 'summary-1',
        details: 'Take after food',
        fileUrl: 'https://example.com/rx.pdf',
      });

      const result = await service.addPrescription(
        'booking-1',
        'user-provider-1',
        {
          details: 'Take after food',
          fileUrl: 'https://example.com/rx.pdf',
        },
      );

      expect(result).toEqual(
        expect.objectContaining({
          id: 'rx-1',
          consultationSummaryId: 'summary-1',
        }),
      );
      expect(prisma.prescription.create).toHaveBeenCalledWith({
        data: {
          consultationSummaryId: 'summary-1',
          details: 'Take after food',
          fileUrl: 'https://example.com/rx.pdf',
        },
      });
      expect(mockNotificationsService.sendNotification).toHaveBeenCalled();
    });

    it('rejects addPrescription when neither details nor fileUrl is provided', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(
        bookingWithSummary,
      );

      await expect(
        service.addPrescription('booking-1', 'user-provider-1', {
          details: '   ',
          fileUrl: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('uploads file and adds prescription for provider-owned booking', async () => {
      const bookingWithSummary = {
        id: 'booking-1',
        provider: {
          id: 'provider-1',
          userId: 'user-provider-1',
          name: 'Dr. Smith',
        },
        patient: {
          id: 'patient-1',
          userId: 'user-patient-1',
          user: { id: 'user-patient-1' },
        },
        consultationSummary: { id: 'summary-1' },
      };

      (prisma.booking.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          ...bookingWithSummary,
          consultationSummary: undefined,
        })
        .mockResolvedValueOnce(bookingWithSummary);

      (prisma.prescription.create as jest.Mock).mockResolvedValue({
        id: 'rx-2',
        consultationSummaryId: 'summary-1',
        details: 'Take after food',
        fileUrl: 'https://supabase.example.com/consultation-booking-1',
      });

      const result = await service.addPrescriptionWithFile(
        'booking-1',
        'user-provider-1',
        {
          originalname: 'rx.pdf',
          mimetype: 'application/pdf',
          size: 1024,
          buffer: Buffer.from('test'),
        },
        'Take after food',
      );

      expect(result).toEqual(
        expect.objectContaining({
          id: 'rx-2',
          consultationSummaryId: 'summary-1',
        }),
      );
      expect(mockPrescriptionStorageService.uploadFile).toHaveBeenCalled();
      expect(mockPrescriptionStorageService.getSignedUrl).toHaveBeenCalled();
    });
  });
});

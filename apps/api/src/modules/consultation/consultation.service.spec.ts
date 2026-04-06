import { Test, TestingModule } from '@nestjs/testing';
import { ConsultationService } from './consultation.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

describe('ConsultationService', () => {
  let service: ConsultationService;
  let prisma: PrismaService;

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
              findMany: jest.fn(),
              count: jest.fn(),
            },
            bookingStatusHistory: {
              create: jest.fn(),
            },
            patientProfile: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ConsultationService>(ConsultationService);
    prisma = module.get<PrismaService>(PrismaService);
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
    it('should return consultation summary with prescriptions', async () => {
      const summaryWithPrescriptions = { ...mockSummary, prescriptions: [] };
      (prisma.consultationSummary.findUnique as jest.Mock).mockResolvedValue(
        summaryWithPrescriptions,
      );

      const result = await service.getSummary('booking-1');

      expect(result).toEqual(summaryWithPrescriptions);
      expect(prisma.consultationSummary.findUnique).toHaveBeenCalledWith({
        where: { bookingId: 'booking-1' },
        include: { prescriptions: true },
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
});

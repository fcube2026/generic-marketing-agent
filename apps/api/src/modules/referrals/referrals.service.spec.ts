import { Test, TestingModule } from '@nestjs/testing';
import { ReferralsService } from './referrals.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('ReferralsService', () => {
  let service: ReferralsService;
  let prisma: PrismaService;

  const mockBooking = {
    id: 'booking-1',
    status: 'COMPLETED',
    providerId: 'provider-1',
    patientId: 'patient-1',
    provider: { id: 'provider-1', userId: 'user-provider-1' },
  };

  const mockReferral = {
    id: 'referral-1',
    bookingId: 'booking-1',
    specialistType: 'Cardiologist',
    notes: 'Patient has irregular heartbeat',
    status: 'RECOMMENDED',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralsService,
        {
          provide: PrismaService,
          useValue: {
            booking: {
              findUnique: jest.fn(),
            },
            referral: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
            patientProfile: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ReferralsService>(ReferralsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReferral', () => {
    const dto = {
      bookingId: 'booking-1',
      specialistType: 'Cardiologist',
      notes: 'Patient has irregular heartbeat',
    };

    it('should create a referral when provider is assigned', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
      (prisma.referral.create as jest.Mock).mockResolvedValue(mockReferral);

      const result = await service.createReferral(dto, 'user-provider-1');

      expect(result).toEqual(mockReferral);
      expect(prisma.referral.create).toHaveBeenCalledWith({
        data: {
          bookingId: 'booking-1',
          specialistType: 'Cardiologist',
          notes: 'Patient has irregular heartbeat',
          status: 'RECOMMENDED',
        },
      });
    });

    it('should throw NotFoundException when booking does not exist', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createReferral(dto, 'user-provider-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the assigned provider', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);

      await expect(service.createReferral(dto, 'user-other')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should create a referral without notes', async () => {
      const dtoWithoutNotes = {
        bookingId: 'booking-1',
        specialistType: 'Cardiologist',
      };
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
      (prisma.referral.create as jest.Mock).mockResolvedValue({
        ...mockReferral,
        notes: null,
      });

      await service.createReferral(dtoWithoutNotes, 'user-provider-1');

      expect(prisma.referral.create).toHaveBeenCalledWith({
        data: {
          bookingId: 'booking-1',
          specialistType: 'Cardiologist',
          notes: undefined,
          status: 'RECOMMENDED',
        },
      });
    });
  });

  describe('updateStatus', () => {
    it('should update referral status', async () => {
      const updatedReferral = { ...mockReferral, status: 'BOOKED' };
      (prisma.referral.findUnique as jest.Mock).mockResolvedValue(mockReferral);
      (prisma.referral.update as jest.Mock).mockResolvedValue(updatedReferral);

      const result = await service.updateStatus('referral-1', {
        status: 'BOOKED',
      });

      expect(result).toEqual(updatedReferral);
      expect(prisma.referral.update).toHaveBeenCalledWith({
        where: { id: 'referral-1' },
        data: { status: 'BOOKED' },
      });
    });

    it('should throw NotFoundException when referral does not exist', async () => {
      (prisma.referral.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateStatus('nonexistent', { status: 'BOOKED' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPatientReferrals', () => {
    const mockPatientProfile = { id: 'patient-1', userId: 'user-patient-1' };
    const mockReferrals = [
      {
        ...mockReferral,
        booking: {
          id: 'booking-1',
          provider: { id: 'provider-1', name: 'Dr. Smith' },
          serviceCategory: { id: 'cat-1', name: 'General' },
        },
      },
    ];

    it('should return paginated referrals for a patient', async () => {
      (prisma.patientProfile.findUnique as jest.Mock).mockResolvedValue(
        mockPatientProfile,
      );
      (prisma.referral.findMany as jest.Mock).mockResolvedValue(mockReferrals);
      (prisma.referral.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getPatientReferrals('user-patient-1', 1, 10);

      expect(result).toEqual({
        data: mockReferrals,
        total: 1,
        page: 1,
        limit: 10,
      });
      expect(prisma.referral.findMany).toHaveBeenCalledWith({
        where: { booking: { patientId: 'patient-1' } },
        include: {
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

      const result = await service.getPatientReferrals('user-unknown', 1, 10);

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 10 });
    });

    it('should handle pagination correctly', async () => {
      (prisma.patientProfile.findUnique as jest.Mock).mockResolvedValue(
        mockPatientProfile,
      );
      (prisma.referral.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.referral.count as jest.Mock).mockResolvedValue(15);

      const result = await service.getPatientReferrals('user-patient-1', 2, 10);

      expect(result).toEqual({ data: [], total: 15, page: 2, limit: 10 });
      expect(prisma.referral.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });
});

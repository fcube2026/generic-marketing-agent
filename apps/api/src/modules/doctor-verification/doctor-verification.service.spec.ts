import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DoctorVerificationService } from './doctor-verification.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NmcApiProvider } from './providers/nmc-api.provider';
import { SmcScraperProvider } from './providers/smc-scraper.provider';
import { FaceVerificationProvider } from './providers/face-verification.provider';
import { AadhaarValidationProvider } from './providers/aadhaar-validation.provider';
import { NotificationsService } from '../notifications/notifications.service';

describe('DoctorVerificationService', () => {
  let service: DoctorVerificationService;

  const mockPrisma = {
    providerProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    providerLicense: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    doctorVerificationLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    adminAction: {
      create: jest.fn(),
    },
  };

  const mockNmcProvider = {
    verify: jest.fn(),
  };

  const mockSmcProvider = {
    verify: jest.fn().mockResolvedValue({ found: false }),
  };

  const mockFaceProvider = {
    verify: jest.fn(),
  };

  const mockAadhaarProvider = {
    validate: jest.fn().mockResolvedValue({ valid: true }),
  };

  const mockNotificationsService = {
    sendNotification: jest.fn().mockResolvedValue({
      inAppId: 'notif-1',
      pushSent: true,
      smsSent: true,
    }),
  };

  const mockProfile = { id: 'provider-1', userId: 'user-1' };
  const mockLicense = {
    id: 'license-1',
    providerId: 'provider-1',
    type: 'MEDICAL_REGISTRATION',
    documentUrl: '',
    status: 'PENDING',
    nmcRegistrationNumber: 'MH-12345',
    stateCouncil: 'Maharashtra Medical Council',
    yearOfAdmission: '2010',
    verificationAttempts: 0,
    lastAttemptAt: null,
    nextReverificationDue: null,
    verificationSource: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorVerificationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NmcApiProvider, useValue: mockNmcProvider },
        { provide: SmcScraperProvider, useValue: mockSmcProvider },
        { provide: FaceVerificationProvider, useValue: mockFaceProvider },
        { provide: AadhaarValidationProvider, useValue: mockAadhaarProvider },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<DoctorVerificationService>(DoctorVerificationService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── submitForVerification ──────────────────────────────────────────────────

  describe('submitForVerification', () => {
    const dto = {
      fullName: 'Dr. Test Doctor',
      nmcRegistrationNumber: 'MH-12345',
      stateCouncil: 'Maharashtra Medical Council',
      yearOfAdmission: '2010',
    };

    it('should throw NotFoundException if provider profile not found', async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.submitForVerification('user-1', dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return cached result if already approved and within window', async () => {
      const future = new Date(Date.now() + 86400000 * 60);
      const approvedLicense = {
        ...mockLicense,
        status: 'APPROVED',
        nextReverificationDue: future,
      };

      mockPrisma.providerProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.providerLicense.create.mockResolvedValue(approvedLicense);
      // Simulate no existing licenseId, creates new, and it's already approved
      mockPrisma.providerLicense.update.mockResolvedValue(approvedLicense);

      // Override the create to return the already-approved license
      mockPrisma.providerLicense.create.mockResolvedValue(approvedLicense);

      // For the cached path we need status APPROVED + nextReverificationDue in future
      // The service creates a license first, then checks. Let's simulate:
      const cachedLicense = {
        ...mockLicense,
        status: 'APPROVED',
        nextReverificationDue: future,
        verificationSource: 'NMC_API',
      };
      mockPrisma.providerLicense.create.mockResolvedValue(cachedLicense);

      const result = await service.submitForVerification('user-1', dto);

      expect(result.cached).toBe(true);
      expect(result.status).toBe('APPROVED');
      expect(mockNmcProvider.verify).not.toHaveBeenCalled();
    });

    it('should call NMC API, find doctor, and route to admin approval', async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.providerLicense.create.mockResolvedValue(mockLicense);

      const pendingLicense = {
        ...mockLicense,
        status: 'PENDING',
        verificationSource: 'PIPELINE',
      };
      mockPrisma.providerLicense.update
        .mockResolvedValueOnce({
          ...mockLicense,
          verificationAttempts: 1,
          lastAttemptAt: new Date(),
        })
        .mockResolvedValueOnce(pendingLicense);

      mockNmcProvider.verify.mockResolvedValue({
        found: true,
        registrationNumber: 'MH-12345',
        name: 'Dr. Test Doctor',
        qualifications: ['MBBS'],
        stateCouncil: 'Maharashtra Medical Council',
        registrationDate: '2010-01-01',
        registrationStatus: 'ACTIVE',
        rawResponse: { source: 'mock' },
      });

      mockPrisma.providerProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        userId: 'user-1',
      });
      mockPrisma.doctorVerificationLog.create.mockResolvedValue({});

      const result = await service.submitForVerification('user-1', dto);

      // Pipeline should NOT auto-approve — status stays NOT_FOUND (pending admin)
      expect(result.status).toBe('NOT_FOUND');
      expect(result.issueCode).toBe(500); // PENDING_ADMIN_APPROVAL
      expect(result.cached).toBe(false);
      expect(mockNmcProvider.verify).toHaveBeenCalledWith({
        memberId: 'MH-12345',
        stateCouncil: 'Maharashtra Medical Council',
        yearOfAdmission: '2010',
      });
      // Doctor's profile should NOT be auto-approved
      expect(mockPrisma.providerProfile.update).not.toHaveBeenCalled();
      // Submission-received notification should fire
      expect(mockNotificationsService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'NMC_VERIFICATION_SUBMITTED' }),
        expect.objectContaining({ inApp: true }),
      );
      expect(mockPrisma.doctorVerificationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'NOT_FOUND' }),
        }),
      );
    });

    it('should mark NOT_FOUND and log when doctor not in NMC records', async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.providerLicense.create.mockResolvedValue(mockLicense);
      mockPrisma.providerLicense.update.mockResolvedValue({
        ...mockLicense,
        verificationAttempts: 1,
        lastAttemptAt: new Date(),
      });

      mockNmcProvider.verify.mockResolvedValue({ found: false });
      mockPrisma.doctorVerificationLog.create.mockResolvedValue({});

      const result = await service.submitForVerification('user-1', dto);

      expect(result.status).toBe('NOT_FOUND');
      expect(mockPrisma.providerProfile.update).not.toHaveBeenCalled();
      expect(mockPrisma.doctorVerificationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'NOT_FOUND',
            errorCode: 'DOCTOR_NOT_FOUND',
          }),
        }),
      );
    });

    it('should mark MANUAL_REVIEW after max attempts', async () => {
      const licenseNearMax = {
        ...mockLicense,
        verificationAttempts: 2, // will become 3 (= MAX_AUTO_ATTEMPTS)
      };

      mockPrisma.providerProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.providerLicense.create.mockResolvedValue(licenseNearMax);
      mockPrisma.providerLicense.update.mockResolvedValue({
        ...licenseNearMax,
        verificationAttempts: 3,
      });

      mockNmcProvider.verify.mockResolvedValue({ found: false });
      mockPrisma.doctorVerificationLog.create.mockResolvedValue({});

      const result = await service.submitForVerification('user-1', dto);

      expect(result.status).toBe('MANUAL_REVIEW');
      expect(mockPrisma.doctorVerificationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'MANUAL_REVIEW' }),
        }),
      );
    });

    it('should gracefully handle NMC API errors and fall back to NOT_FOUND', async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.providerLicense.create.mockResolvedValue(mockLicense);
      mockPrisma.providerLicense.update.mockResolvedValue({
        ...mockLicense,
        verificationAttempts: 1,
      });
      mockPrisma.providerLicense.findUnique.mockResolvedValue(mockLicense);

      mockNmcProvider.verify.mockRejectedValue(new Error('API timeout'));
      mockSmcProvider.verify.mockResolvedValue({ found: false });
      mockPrisma.doctorVerificationLog.create.mockResolvedValue({});

      const result = await service.submitForVerification('user-1', dto);

      // Pipeline gracefully degrades: NMC API error → SMC not found → NOT_FOUND status
      expect(result.status).toBe('NOT_FOUND');
      expect(mockPrisma.doctorVerificationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'NOT_FOUND',
            errorCode: 'DOCTOR_NOT_FOUND',
          }),
        }),
      );
    });
  });

  // ─── retryVerification ──────────────────────────────────────────────────────

  describe('retryVerification', () => {
    it('should throw NotFoundException if license not found', async () => {
      mockPrisma.providerLicense.findUnique.mockResolvedValue(null);

      await expect(
        service.retryVerification('unknown', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if license has no NMC details', async () => {
      mockPrisma.providerLicense.findUnique.mockResolvedValue({
        ...mockLicense,
        nmcRegistrationNumber: null,
        stateCouncil: null,
      });

      await expect(
        service.retryVerification('license-1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create admin action and retry verification', async () => {
      mockPrisma.providerLicense.findUnique.mockResolvedValue(mockLicense);
      mockPrisma.adminAction.create.mockResolvedValue({});
      mockPrisma.providerLicense.update
        .mockResolvedValueOnce({
          ...mockLicense,
          verificationAttempts: 1,
        })
        .mockResolvedValueOnce({
          ...mockLicense,
          status: 'PENDING',
          verificationSource: 'PIPELINE',
        });

      mockNmcProvider.verify.mockResolvedValue({
        found: true,
        rawResponse: {},
      });
      mockPrisma.providerProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        userId: 'user-1',
      });
      mockPrisma.doctorVerificationLog.create.mockResolvedValue({});

      await service.retryVerification('license-1', 'admin-1');

      expect(mockPrisma.adminAction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'RETRY_NMC_VERIFICATION',
            targetId: 'license-1',
            adminId: 'admin-1',
          }),
        }),
      );
      expect(mockNmcProvider.verify).toHaveBeenCalled();
      // Pipeline still should NOT auto-approve
      expect(mockPrisma.providerProfile.update).not.toHaveBeenCalled();
    });
  });

  // ─── getVerificationQueue ───────────────────────────────────────────────────

  describe('getVerificationQueue', () => {
    it('should return paginated pending licenses', async () => {
      const pendingLicenses = [mockLicense];
      mockPrisma.providerLicense.findMany.mockResolvedValue(pendingLicenses);
      mockPrisma.providerLicense.count.mockResolvedValue(1);

      const result = await service.getVerificationQueue(1, 20);

      expect(result.data).toEqual(pendingLicenses);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should return empty queue when no pending licenses', async () => {
      mockPrisma.providerLicense.findMany.mockResolvedValue([]);
      mockPrisma.providerLicense.count.mockResolvedValue(0);

      const result = await service.getVerificationQueue();

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ─── getVerificationLogs ────────────────────────────────────────────────────

  describe('getVerificationLogs', () => {
    it('should return logs for a provider by userId', async () => {
      const logs = [
        {
          id: 'log-1',
          providerId: 'provider-1',
          registrationNumber: 'MH-12345',
          status: 'SUCCESS',
        },
      ];
      mockPrisma.providerProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.doctorVerificationLog.findMany.mockResolvedValue(logs);

      const result = await service.getVerificationLogs('user-1');

      expect(result).toEqual(logs);
      expect(mockPrisma.doctorVerificationLog.findMany).toHaveBeenCalledWith({
        where: { providerId: 'provider-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw NotFoundException if provider not found', async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getVerificationLogs('unknown-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

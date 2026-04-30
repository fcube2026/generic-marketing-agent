import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  PrescriptionStatus,
  PrescriptionReviewAction,
  Role,
} from '@prisma/client';
import { PrescriptionService } from './prescription.service';
import { VerifyAction } from './dto/verify-prescription.dto';
import type { UploadedPrescriptionFile } from './prescription.service';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

const mockPrisma = {
  uploadedPrescription: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  prescriptionReviewLog: {
    create: jest.fn(),
  },
  auditLog: {
    create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    findMany: jest.fn().mockResolvedValue([]),
  },
  $transaction: jest.fn(),
  user: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
} as any;

const mockStorage = {
  uploadFile: jest.fn().mockResolvedValue('user-1/rx-1'),
  getSignedUrl: jest
    .fn()
    .mockResolvedValue('https://supabase.example.com/signed'),
} as any;

const mockNotifications = {
  createNotification: jest.fn().mockResolvedValue({ inAppId: 'notif-1' }),
} as any;

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('PrescriptionService', () => {
  let service: PrescriptionService;

  beforeEach(() => {
    service = new PrescriptionService(
      mockPrisma,
      mockStorage,
      mockNotifications,
    );
    jest.clearAllMocks();
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: 'admin-1',
        email: 'admin@curex24.com',
        phone: '+910000000001',
        role: Role.ADMIN,
      },
    ]);
    mockPrisma.uploadedPrescription.findFirst.mockResolvedValue(null);
  });

  // -------------------------------------------------------------------------
  // handleUpload
  // -------------------------------------------------------------------------

  describe('handleUpload', () => {
    const validFile: UploadedPrescriptionFile = {
      fieldname: 'file',
      originalname: 'prescription.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
      size: 1024,
    } as any;

    it('stores a valid JPEG file and returns upload metadata', async () => {
      mockPrisma.uploadedPrescription.create.mockResolvedValue({
        id: 'rx-1',
        userId: 'user-1',
        filePath: '',
        status: PrescriptionStatus.PENDING_REVIEW,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.uploadedPrescription.update.mockResolvedValue({
        id: 'rx-1',
        filePath: 'user-1/rx-1',
        assignedReviewerId: 'admin-1',
      });

      const result = await service.handleUpload('user-1', validFile);

      expect(mockPrisma.uploadedPrescription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            status: PrescriptionStatus.PENDING_REVIEW,
          }),
        }),
      );
      expect(mockStorage.uploadFile).toHaveBeenCalledWith(
        'user-1',
        'rx-1',
        validFile.buffer,
        'image/jpeg',
      );
      expect(mockPrisma.uploadedPrescription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rx-1' },
          data: {
            filePath: 'user-1/rx-1',
            assignedReviewerId: 'admin-1',
            assignedAt: expect.any(Date),
          },
        }),
      );
      expect(mockStorage.getSignedUrl).toHaveBeenCalledWith('user-1/rx-1');
      expect(result).toEqual({
        prescriptionId: 'rx-1',
        status: PrescriptionStatus.PENDING_REVIEW,
        fileUrl: 'https://supabase.example.com/signed',
      });
      expect(mockNotifications.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: 'PRESCRIPTION_UPLOADED',
          metadata: expect.objectContaining({
            prescriptionId: 'rx-1',
            status: PrescriptionStatus.PENDING_REVIEW,
          }),
        }),
      );
    });

    it('accepts PNG files', async () => {
      const pngFile = { ...validFile, mimetype: 'image/png' };
      mockPrisma.uploadedPrescription.create.mockResolvedValue({ id: 'rx-2' });
      mockPrisma.uploadedPrescription.update.mockResolvedValue({ id: 'rx-2' });

      await expect(
        service.handleUpload('user-1', pngFile),
      ).resolves.not.toThrow();
    });

    it('accepts PDF files', async () => {
      const pdfFile = { ...validFile, mimetype: 'application/pdf' };
      mockPrisma.uploadedPrescription.create.mockResolvedValue({ id: 'rx-3' });
      mockPrisma.uploadedPrescription.update.mockResolvedValue({ id: 'rx-3' });

      await expect(
        service.handleUpload('user-1', pdfFile),
      ).resolves.not.toThrow();
    });

    it('rejects files with an invalid MIME type', async () => {
      const gifFile = { ...validFile, mimetype: 'image/gif' };

      await expect(service.handleUpload('user-1', gifFile)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockStorage.uploadFile).not.toHaveBeenCalled();
    });

    it('rejects files that exceed the 10 MB size limit', async () => {
      const largeFile = {
        ...validFile,
        size: 11 * 1024 * 1024,
      };

      await expect(service.handleUpload('user-1', largeFile)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockStorage.uploadFile).not.toHaveBeenCalled();
    });

    it('propagates storage upload errors and cleans up the DB record', async () => {
      mockPrisma.uploadedPrescription.create.mockResolvedValue({ id: 'rx-1' });
      mockPrisma.uploadedPrescription.delete.mockResolvedValue({});
      mockStorage.uploadFile.mockRejectedValueOnce(
        new Error('Storage bucket not found'),
      );

      await expect(service.handleUpload('user-1', validFile)).rejects.toThrow(
        'Storage bucket not found',
      );
      // The dangling record should be cleaned up
      expect(mockPrisma.uploadedPrescription.delete).toHaveBeenCalledWith({
        where: { id: 'rx-1' },
      });
    });

    it('auto-assigns uploads round-robin across active reviewers', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'admin-1',
          email: 'admin@curex24.com',
          phone: '+910000000001',
          role: Role.ADMIN,
        },
        {
          id: 'pharmacist-1',
          email: 'pharmacist@curex24.com',
          phone: '+910000000002',
          role: Role.PHARMACIST,
        },
      ]);
      mockPrisma.uploadedPrescription.findFirst.mockResolvedValue({
        assignedReviewerId: 'admin-1',
      });
      mockPrisma.uploadedPrescription.create.mockResolvedValue({ id: 'rx-7' });
      mockPrisma.uploadedPrescription.update.mockResolvedValue({ id: 'rx-7' });

      await service.handleUpload('user-1', validFile);

      expect(mockPrisma.uploadedPrescription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rx-7' },
          data: expect.objectContaining({
            assignedReviewerId: 'pharmacist-1',
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // verifyPrescription
  // -------------------------------------------------------------------------

  describe('verifyPrescription', () => {
    const adminActor = { id: 'admin-1', role: Role.ADMIN };

    const pendingPrescription = {
      id: 'rx-1',
      userId: 'user-1',
      filePath: 'user-1/rx-1',
      status: PrescriptionStatus.PENDING_REVIEW,
      assignedReviewerId: null,
      assignedAt: null,
      reviewedBy: null,
      reviewNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { id: 'user-1', phone: '+911234567890', email: null },
      assignedReviewer: null,
    };

    beforeEach(() => {
      mockPrisma.uploadedPrescription.findUnique.mockResolvedValue(
        pendingPrescription,
      );
      mockPrisma.$transaction.mockImplementation(async (ops: any[]) => {
        return Promise.all(ops);
      });
      mockPrisma.uploadedPrescription.update.mockResolvedValue({
        ...pendingPrescription,
        status: PrescriptionStatus.APPROVED,
        reviewedBy: 'admin-1',
      });
      mockPrisma.prescriptionReviewLog.create.mockResolvedValue({
        id: 'log-1',
      });
    });

    it('approves a pending prescription', async () => {
      const result = await service.verifyPrescription(
        'rx-1',
        adminActor,
        VerifyAction.APPROVE,
        'All good',
      );

      expect(mockPrisma.uploadedPrescription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rx-1' },
          data: expect.objectContaining({
            status: PrescriptionStatus.APPROVED,
            assignedReviewerId: 'admin-1',
            assignedAt: expect.any(Date),
            reviewedBy: 'admin-1',
            reviewNotes: 'All good',
          }),
        }),
      );
      expect(mockPrisma.prescriptionReviewLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            prescriptionId: 'rx-1',
            action: PrescriptionReviewAction.APPROVED,
            performedBy: 'admin-1',
          }),
        }),
      );
      expect(result).toBeDefined();
      expect(mockNotifications.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: 'PRESCRIPTION_REVIEW_RESULT',
          metadata: expect.objectContaining({
            prescriptionId: 'rx-1',
            action: VerifyAction.APPROVE,
          }),
        }),
      );
    });

    it('rejects a pending prescription', async () => {
      mockPrisma.uploadedPrescription.update.mockResolvedValue({
        ...pendingPrescription,
        status: PrescriptionStatus.REJECTED,
      });

      await service.verifyPrescription(
        'rx-1',
        adminActor,
        VerifyAction.REJECT,
        'Image is blurry',
      );

      expect(mockPrisma.uploadedPrescription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PrescriptionStatus.REJECTED,
          }),
        }),
      );
    });

    it('requests re-upload for a pending prescription', async () => {
      mockPrisma.uploadedPrescription.update.mockResolvedValue({
        ...pendingPrescription,
        status: PrescriptionStatus.REUPLOAD_REQUIRED,
      });

      await service.verifyPrescription(
        'rx-1',
        adminActor,
        VerifyAction.REUPLOAD,
      );

      expect(mockPrisma.uploadedPrescription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PrescriptionStatus.REUPLOAD_REQUIRED,
          }),
        }),
      );
    });

    it('prevents re-verification of an already APPROVED prescription', async () => {
      mockPrisma.uploadedPrescription.findUnique.mockResolvedValue({
        ...pendingPrescription,
        status: PrescriptionStatus.APPROVED,
      });

      await expect(
        service.verifyPrescription('rx-1', adminActor, VerifyAction.APPROVE),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('prevents re-verification of an already REJECTED prescription', async () => {
      mockPrisma.uploadedPrescription.findUnique.mockResolvedValue({
        ...pendingPrescription,
        status: PrescriptionStatus.REJECTED,
      });

      await expect(
        service.verifyPrescription('rx-1', adminActor, VerifyAction.REJECT),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for an unknown prescription ID', async () => {
      mockPrisma.uploadedPrescription.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyPrescription('unknown', adminActor, VerifyAction.APPROVE),
      ).rejects.toThrow(NotFoundException);
    });

    it('prevents pharmacists from reviewing prescriptions assigned to someone else', async () => {
      mockPrisma.uploadedPrescription.findUnique.mockResolvedValue({
        ...pendingPrescription,
        assignedReviewerId: 'pharmacist-2',
      });

      await expect(
        service.verifyPrescription(
          'rx-1',
          { id: 'pharmacist-1', role: Role.PHARMACIST },
          VerifyAction.APPROVE,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('assignReviewer', () => {
    it('assigns a pending prescription to an active reviewer', async () => {
      mockPrisma.uploadedPrescription.findUnique.mockResolvedValue({
        id: 'rx-1',
        userId: 'user-1',
        filePath: 'user-1/rx-1',
        status: PrescriptionStatus.PENDING_REVIEW,
        assignedReviewerId: null,
        assignedAt: null,
        reviewedBy: null,
        reviewNotes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user-1', phone: '+911234567890', email: null },
        assignedReviewer: null,
      });
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'pharmacist-1',
        email: 'pharmacist@curex24.com',
        phone: '+910000000002',
        role: Role.PHARMACIST,
      });
      mockPrisma.uploadedPrescription.update.mockResolvedValue({
        id: 'rx-1',
        assignedReviewerId: 'pharmacist-1',
      });

      await service.assignReviewer('rx-1', 'pharmacist-1', 'admin-1');

      expect(mockPrisma.uploadedPrescription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rx-1' },
          data: expect.objectContaining({
            assignedReviewerId: 'pharmacist-1',
            assignedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('getReviewers', () => {
    it('returns active admin and pharmacist users for assignment', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'admin-1',
          email: 'admin@curex24.com',
          phone: '+910000000001',
          role: Role.ADMIN,
        },
        {
          id: 'pharmacist-1',
          email: 'pharmacist@curex24.com',
          phone: '+910000000002',
          role: Role.PHARMACIST,
        },
      ]);

      const reviewers = await service.getReviewers();

      expect(reviewers).toHaveLength(2);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: { in: [Role.ADMIN, Role.PHARMACIST] },
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // assertPrescriptionApproved (order gate)
  // -------------------------------------------------------------------------

  describe('assertPrescriptionApproved', () => {
    it('passes silently when the prescription is APPROVED', async () => {
      mockPrisma.uploadedPrescription.findUnique.mockResolvedValue({
        id: 'rx-1',
        userId: 'user-1',
        status: PrescriptionStatus.APPROVED,
      });

      await expect(
        service.assertPrescriptionApproved('rx-1', 'user-1'),
      ).resolves.toBeUndefined();
    });

    it('throws ForbiddenException when prescription is PENDING_REVIEW', async () => {
      mockPrisma.uploadedPrescription.findUnique.mockResolvedValue({
        id: 'rx-1',
        userId: 'user-1',
        status: PrescriptionStatus.PENDING_REVIEW,
      });

      await expect(
        service.assertPrescriptionApproved('rx-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when prescription is REJECTED', async () => {
      mockPrisma.uploadedPrescription.findUnique.mockResolvedValue({
        id: 'rx-1',
        userId: 'user-1',
        status: PrescriptionStatus.REJECTED,
      });

      await expect(
        service.assertPrescriptionApproved('rx-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when the prescription belongs to another user', async () => {
      mockPrisma.uploadedPrescription.findUnique.mockResolvedValue({
        id: 'rx-1',
        userId: 'other-user',
        status: PrescriptionStatus.APPROVED,
      });

      await expect(
        service.assertPrescriptionApproved('rx-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for an unknown prescription', async () => {
      mockPrisma.uploadedPrescription.findUnique.mockResolvedValue(null);

      await expect(
        service.assertPrescriptionApproved('missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // getDetails
  // -------------------------------------------------------------------------

  describe('getDetails', () => {
    it('returns prescription details with a signed URL', async () => {
      const rx = {
        id: 'rx-1',
        userId: 'user-1',
        filePath: 'user-1/rx-1',
        status: PrescriptionStatus.PENDING_REVIEW,
        assignedReviewerId: 'admin-1',
        assignedAt: new Date(Date.now() - 60 * 1000),
        createdAt: new Date(Date.now() - 5 * 60 * 1000),
        updatedAt: new Date(),
        user: { id: 'user-1', phone: '+911234567890', email: null },
        assignedReviewer: {
          id: 'admin-1',
          email: 'admin@curex24.com',
          phone: '+910000000001',
          role: Role.ADMIN,
        },
      };
      mockPrisma.uploadedPrescription.findUnique.mockResolvedValue(rx);

      const result = await service.getDetails('rx-1');

      expect(result.fileUrl).toBe('https://supabase.example.com/signed');
      expect(result.sla).toHaveProperty('targetMs');
      expect(result.sla).toHaveProperty('breached');
    });
  });
});

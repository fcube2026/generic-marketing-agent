import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrescriptionStatus, PrescriptionReviewAction } from '@prisma/client';
import { PrescriptionService } from './prescription.service';
import { VerifyAction } from './dto/verify-prescription.dto';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

const mockPrisma = {
  uploadedPrescription: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  prescriptionReviewLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
} as any;

const mockStorage = {
  uploadFile: jest.fn().mockResolvedValue('user-1/rx-1'),
  getSignedUrl: jest
    .fn()
    .mockResolvedValue('https://supabase.example.com/signed'),
} as any;

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('PrescriptionService', () => {
  let service: PrescriptionService;

  beforeEach(() => {
    service = new PrescriptionService(mockPrisma, mockStorage);
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // handleUpload
  // -------------------------------------------------------------------------

  describe('handleUpload', () => {
    const validFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'prescription.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
      size: 1024,
    } as any;

    it('stores a valid JPEG file and returns prescriptionId', async () => {
      mockPrisma.uploadedPrescription.create.mockResolvedValue({
        id: 'rx-1',
        userId: 'user-1',
        filePath: 'user-1/rx-1',
        status: PrescriptionStatus.PENDING_REVIEW,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.handleUpload('user-1', validFile);

      expect(mockStorage.uploadFile).toHaveBeenCalledWith(
        'user-1',
        expect.any(String),
        validFile.buffer,
        'image/jpeg',
      );
      expect(mockPrisma.uploadedPrescription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            status: PrescriptionStatus.PENDING_REVIEW,
          }),
        }),
      );
      expect(result).toHaveProperty('prescriptionId', 'rx-1');
    });

    it('accepts PNG files', async () => {
      const pngFile = { ...validFile, mimetype: 'image/png' };
      mockPrisma.uploadedPrescription.create.mockResolvedValue({ id: 'rx-2' });

      await expect(
        service.handleUpload('user-1', pngFile),
      ).resolves.not.toThrow();
    });

    it('accepts PDF files', async () => {
      const pdfFile = { ...validFile, mimetype: 'application/pdf' };
      mockPrisma.uploadedPrescription.create.mockResolvedValue({ id: 'rx-3' });

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

    it('propagates storage upload errors', async () => {
      mockStorage.uploadFile.mockRejectedValueOnce(
        new Error('Storage bucket not found'),
      );

      await expect(service.handleUpload('user-1', validFile)).rejects.toThrow(
        'Storage bucket not found',
      );
      expect(mockPrisma.uploadedPrescription.create).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // verifyPrescription
  // -------------------------------------------------------------------------

  describe('verifyPrescription', () => {
    const pendingPrescription = {
      id: 'rx-1',
      userId: 'user-1',
      filePath: 'user-1/rx-1',
      status: PrescriptionStatus.PENDING_REVIEW,
      reviewedBy: null,
      reviewNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { id: 'user-1', phone: '+911234567890', email: null },
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
        'admin-1',
        VerifyAction.APPROVE,
        'All good',
      );

      expect(mockPrisma.uploadedPrescription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rx-1' },
          data: expect.objectContaining({
            status: PrescriptionStatus.APPROVED,
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
    });

    it('rejects a pending prescription', async () => {
      mockPrisma.uploadedPrescription.update.mockResolvedValue({
        ...pendingPrescription,
        status: PrescriptionStatus.REJECTED,
      });

      await service.verifyPrescription(
        'rx-1',
        'admin-1',
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
        'admin-1',
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
        service.verifyPrescription('rx-1', 'admin-1', VerifyAction.APPROVE),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('prevents re-verification of an already REJECTED prescription', async () => {
      mockPrisma.uploadedPrescription.findUnique.mockResolvedValue({
        ...pendingPrescription,
        status: PrescriptionStatus.REJECTED,
      });

      await expect(
        service.verifyPrescription('rx-1', 'admin-1', VerifyAction.REJECT),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for an unknown prescription ID', async () => {
      mockPrisma.uploadedPrescription.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyPrescription('unknown', 'admin-1', VerifyAction.APPROVE),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // assertPrescriptionApproved (order gate)
  // -------------------------------------------------------------------------

  describe('assertPrescriptionApproved', () => {
    it('passes silently when the prescription is APPROVED', async () => {
      mockPrisma.uploadedPrescription.findUnique.mockResolvedValue({
        id: 'rx-1',
        status: PrescriptionStatus.APPROVED,
      });

      await expect(
        service.assertPrescriptionApproved('rx-1'),
      ).resolves.toBeUndefined();
    });

    it('throws ForbiddenException when prescription is PENDING_REVIEW', async () => {
      mockPrisma.uploadedPrescription.findUnique.mockResolvedValue({
        id: 'rx-1',
        status: PrescriptionStatus.PENDING_REVIEW,
      });

      await expect(service.assertPrescriptionApproved('rx-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when prescription is REJECTED', async () => {
      mockPrisma.uploadedPrescription.findUnique.mockResolvedValue({
        id: 'rx-1',
        status: PrescriptionStatus.REJECTED,
      });

      await expect(service.assertPrescriptionApproved('rx-1')).rejects.toThrow(
        ForbiddenException,
      );
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
        createdAt: new Date(Date.now() - 5 * 60 * 1000),
        updatedAt: new Date(),
        user: { id: 'user-1', phone: '+911234567890', email: null },
      };
      mockPrisma.uploadedPrescription.findUnique.mockResolvedValue(rx);

      const result = await service.getDetails('rx-1');

      expect(result.fileUrl).toBe('https://supabase.example.com/signed');
      expect(result.sla).toHaveProperty('targetMs');
      expect(result.sla).toHaveProperty('breached');
    });
  });
});

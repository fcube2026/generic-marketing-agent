import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FeatureFlags } from '../../common/feature-flags/feature-flags';
import {
  PharmacyOrderStatus,
  PrescriptionStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePharmacyOrderDto } from './dto/create-pharmacy-order.dto';
import { PharmacyOrderResponseDto } from './dto/pharmacy-order-response.dto';
import { PharmacyPartnerProvider } from './providers/pharmacy-partner.interface';
import { PrescriptionService } from '../prescription/prescription.service';
import { PrescriptionStorageService } from '../prescription/prescription-storage.service';
import { encrypt, decrypt } from '../../common/utils/encryption.util';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePrescriptionOrderDto } from './dto/create-prescription-order.dto';

interface ApprovePrescriptionOrderDto {
  partnerId: string;
  items: Array<{
    medicineCode: string;
    medicineName: string;
    quantity: number;
    unitPrice: number;
  }>;
  notes?: string;
}

interface RejectPrescriptionOrderDto {
  reason: string;
}

const PAYMENT_STATUS = {
  UNPAID: 'UNPAID',
  PAID: 'PAID',
} as const;

const ORDER_STATUS = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PAID: 'PAID',
} as const;

type PharmacyOrderWithRelations = Prisma.PharmacyOrderGetPayload<{
  include: {
    items: true;
    deliveryAddress: true;
    pharmacyPartner: true;
  };
}> & {
  uploadedPrescriptionId?: string | null;
};

@Injectable()
export class PharmacyOrderService {
  private readonly logger = new Logger(PharmacyOrderService.name);

  private static readonly FREE_DELIVERY_THRESHOLD = 450;

  private static readonly DELIVERY_FEE_TIERS = [
    { minSubtotal: 250, fee: 25 },
    { minSubtotal: 120, fee: 40 },
  ] as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly partnerProviders: Map<string, PharmacyPartnerProvider>,
    private readonly prescriptionService: PrescriptionService,
    private readonly prescriptionStorage: PrescriptionStorageService,
    private readonly notificationsService?: NotificationsService,
  ) {}

  async placeOrder(
    userId: string,
    dto: CreatePharmacyOrderDto,
  ): Promise<PharmacyOrderResponseDto> {
    const patient = await this.getPatientProfile(userId);
    const partner = await this.prisma.pharmacyPartner.findFirst({
      where: { id: dto.partnerId, isActive: true },
    });
    if (!partner) {
      throw new BadRequestException('Pharmacy partner not found or inactive');
    }

    let address;
    if (dto.deliveryAddressId) {
      address = await this.prisma.address.findFirst({
        where: { id: dto.deliveryAddressId, userId },
      });
      if (!address) {
        throw new NotFoundException('Delivery address not found');
      }
    } else if (dto.deliveryAddress) {
      address = await this.prisma.address.create({
        data: {
          userId,
          label: 'Delivery',
          // Application-level PII encryption — address is sensitive and only
          // ever read back through this service, which decrypts on response.
          addressLine: encrypt(dto.deliveryAddress.addressLine),
          city: dto.deliveryAddress.city,
          state: dto.deliveryAddress.state,
          pincode: dto.deliveryAddress.pincode,
        },
      });
    } else {
      throw new BadRequestException('Delivery address is required');
    }

    if (dto.prescriptionId) {
      const prescription = await this.prisma.prescription.findFirst({
        where: {
          id: dto.prescriptionId,
          consultationSummary: {
            booking: {
              patientId: patient.id,
            },
          },
        },
      });

      if (!prescription) {
        throw new BadRequestException(
          'Prescription not found for this patient',
        );
      }
    }

    if (dto.uploadedPrescriptionId) {
      await this.prescriptionService.assertPrescriptionApproved(
        dto.uploadedPrescriptionId,
        userId,
      );
    }

    const provider = this.resolveProvider(partner.code, partner.name);
    const partnerItems = dto.items.map((item) => ({
      medicineCode: item.medicineCode,
      medicineName: item.medicineName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));

    const subtotal = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const deliveryFee = this.calculateDeliveryFee(subtotal);
    const totalAmount = Math.max(0, subtotal + deliveryFee);

    const partnerResult = await provider.createOrder({
      patientId: patient.id,
      items: partnerItems,
      deliveryAddress: this.formatAddress(address),
    });

    const order = await this.prisma.pharmacyOrder.create({
      data: {
        orderNumber: this.generateOrderNumber(),
        patientProfileId: patient.id,
        bookingId: dto.bookingId ?? null,
        prescriptionId: dto.prescriptionId ?? null,
        uploadedPrescriptionId: dto.uploadedPrescriptionId ?? null,
        pharmacyPartnerId: partner.id,
        partnerOrderId: partnerResult.partnerOrderId,
        deliveryAddressId: address.id,
        subtotal,
        deliveryFee,
        discount: 0,
        totalAmount,
        paymentStatus: PAYMENT_STATUS.PAID,
        status: this.mapPartnerStatus(partnerResult.status),
        notes: dto.notes ?? null,
        items: {
          create: dto.items.map((item) => ({
            medicineCode: item.medicineCode,
            medicineName: item.medicineName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
          })),
        },
      },
      include: {
        items: true,
        deliveryAddress: true,
        pharmacyPartner: true,
      },
    });

    return this.toResponseDto(order);
  }

  async createPrescriptionOnlyOrder(
    userId: string,
    dto: CreatePrescriptionOrderDto,
  ): Promise<PharmacyOrderResponseDto> {
    this.assertPrescriptionFlowEnabled();
    const patient = await this.getPatientProfile(userId);

    if (!dto.uploadedPrescriptionId && !dto.prescriptionUrl) {
      throw new BadRequestException(
        'Either uploadedPrescriptionId or prescriptionUrl is required.',
      );
    }

    let uploadedPrescriptionId: string | null = null;
    if (dto.uploadedPrescriptionId) {
      const uploadedPrescription =
        await this.prisma.uploadedPrescription.findFirst({
          where: {
            id: dto.uploadedPrescriptionId,
            userId,
            status: {
              in: [
                PrescriptionStatus.PENDING_REVIEW,
                PrescriptionStatus.REUPLOAD_REQUIRED,
                PrescriptionStatus.APPROVED,
              ],
            },
          },
          select: {
            id: true,
          },
        });

      if (!uploadedPrescription) {
        throw new BadRequestException(
          'Uploaded prescription not found for this patient.',
        );
      }

      uploadedPrescriptionId = uploadedPrescription.id;
    }

    const address = await this.resolveOrderAddress(
      userId,
      dto.deliveryAddressId,
    );

    const order = await this.prisma.pharmacyOrder.create({
      data: {
        orderNumber: this.generateOrderNumber(),
        patientProfileId: patient.id,
        uploadedPrescriptionId,
        pharmacyPartnerId: null,
        partnerOrderId: null,
        deliveryAddressId: address.id,
        prescriptionImageUrl: null,
        prescriptionUrl: dto.prescriptionUrl ?? null,
        subtotal: null,
        deliveryFee: null,
        discount: 0,
        totalAmount: null,
        paymentStatus: PAYMENT_STATUS.UNPAID,
        status: ORDER_STATUS.PENDING_APPROVAL as any,
        notes: dto.notes ?? null,
      } as any,
      include: {
        items: true,
        deliveryAddress: true,
        pharmacyPartner: true,
      },
    });

    return this.toResponseDto(order);
  }

  async listPendingPrescriptionApprovals(
    page = 1,
    limit = 20,
  ): Promise<{
    data: PharmacyOrderResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.assertPrescriptionFlowEnabled();
    const where: Prisma.PharmacyOrderWhereInput = {
      status: ORDER_STATUS.PENDING_APPROVAL as any,
    };

    const [orders, total] = await Promise.all([
      this.prisma.pharmacyOrder.findMany({
        where,
        include: {
          items: true,
          deliveryAddress: true,
          pharmacyPartner: true,
        },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.pharmacyOrder.count({ where }),
    ]);

    const data = await Promise.all(
      orders.map(async (order) => {
        const dto = this.toResponseDto(order);
        const fresh = await this.refreshPrescriptionSignedUrl(order);
        if (fresh) {
          dto.prescriptionUrl = fresh;
          dto.prescriptionImageUrl = fresh;
        }
        return dto;
      }),
    );

    return {
      data,
      total,
      page,
      limit,
    };
  }

  private async refreshPrescriptionSignedUrl(
    order: PharmacyOrderWithRelations,
  ): Promise<string | null> {
    const uploadedId = order.uploadedPrescriptionId;
    if (!uploadedId) return null;
    try {
      const upload = await this.prisma.uploadedPrescription.findUnique({
        where: { id: uploadedId },
        select: { filePath: true },
      });
      if (!upload?.filePath) return null;
      return await this.prescriptionStorage.getSignedUrl(upload.filePath);
    } catch (err) {
      this.logger.warn(
        `Failed to refresh signed URL for order ${order.id}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  async listAllPrescriptionOrders(
    page = 1,
    limit = 20,
    status?: string,
  ): Promise<{
    data: PharmacyOrderResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const where: Prisma.PharmacyOrderWhereInput = {
      status: status
        ? (status as any)
        : {
            in: [
              ORDER_STATUS.PENDING_APPROVAL,
              ORDER_STATUS.APPROVED,
              ORDER_STATUS.REJECTED,
            ] as any[],
          },
    };

    const [orders, total] = await Promise.all([
      this.prisma.pharmacyOrder.findMany({
        where,
        include: {
          items: true,
          deliveryAddress: true,
          pharmacyPartner: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.pharmacyOrder.count({ where }),
    ]);

    const data = await Promise.all(
      orders.map(async (order) => {
        const dto = this.toResponseDto(order);
        const fresh = await this.refreshPrescriptionSignedUrl(order);
        if (fresh) {
          dto.prescriptionUrl = fresh;
          dto.prescriptionImageUrl = fresh;
        }
        return dto;
      }),
    );

    return { data, total, page, limit };
  }

  async getPrescriptionOrderImageUrl(orderId: string): Promise<string | null> {
    const order = await this.prisma.pharmacyOrder.findUnique({
      where: { id: orderId },
      select: { uploadedPrescriptionId: true, prescriptionUrl: true },
    });
    if (!order) return null;

    if (order.uploadedPrescriptionId) {
      const upload = await this.prisma.uploadedPrescription.findUnique({
        where: { id: order.uploadedPrescriptionId },
        select: { filePath: true },
      });
      if (upload?.filePath) {
        try {
          return await this.prescriptionStorage.getSignedUrl(upload.filePath);
        } catch {
          // fall through to prescriptionUrl
        }
      }
    }

    return (order as any).prescriptionUrl ?? null;
  }

  async approvePrescriptionOrder(
    orderId: string,
    actorUserId: string,
    dto: ApprovePrescriptionOrderDto,
  ): Promise<PharmacyOrderResponseDto> {
    this.assertPrescriptionFlowEnabled();
    const existing = await this.prisma.pharmacyOrder.findUnique({
      where: { id: orderId },
      include: {
        patientProfile: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Pharmacy order not found');
    }
    if ((existing.status as string) !== ORDER_STATUS.PENDING_APPROVAL) {
      throw new BadRequestException(
        'Only pending prescription orders can be approved.',
      );
    }

    const partner = await this.prisma.pharmacyPartner.findFirst({
      where: { id: dto.partnerId, isActive: true },
      select: { id: true },
    });
    if (!partner) {
      throw new BadRequestException('Pharmacy partner not found or inactive');
    }

    const subtotal = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const deliveryFee = this.calculateDeliveryFee(subtotal);
    const totalAmount = Math.max(0, subtotal + deliveryFee);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.pharmacyOrderItem.deleteMany({
        where: { pharmacyOrderId: orderId },
      });

      return tx.pharmacyOrder.update({
        where: { id: orderId },
        data: {
          pharmacyPartnerId: partner.id,
          subtotal,
          deliveryFee,
          discount: 0,
          totalAmount,
          paymentStatus: PAYMENT_STATUS.UNPAID,
          status: ORDER_STATUS.APPROVED as any,
          notes: dto.notes ?? existing.notes,
          items: {
            create: dto.items.map((item) => ({
              medicineCode: item.medicineCode,
              medicineName: item.medicineName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
            })),
          },
        },
        include: {
          items: true,
          deliveryAddress: true,
          pharmacyPartner: true,
        },
      });
    });

    await this.safeNotify(existing.patientProfile.userId, {
      title: 'Prescription Approved',
      message:
        'Your prescription order is approved. Please complete payment to proceed.',
      type: 'PRESCRIPTION_ORDER_APPROVED',
      metadata: { orderId: updated.id },
    });

    void this.recordStatusHistory(
      orderId,
      ORDER_STATUS.APPROVED as any,
      actorUserId,
    );

    return this.toResponseDto(updated);
  }

  async rejectPrescriptionOrder(
    orderId: string,
    actorUserId: string,
    dto: RejectPrescriptionOrderDto,
  ): Promise<PharmacyOrderResponseDto> {
    this.assertPrescriptionFlowEnabled();
    const existing = await this.prisma.pharmacyOrder.findUnique({
      where: { id: orderId },
      include: {
        patientProfile: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Pharmacy order not found');
    }
    if ((existing.status as string) !== ORDER_STATUS.PENDING_APPROVAL) {
      throw new BadRequestException(
        'Only pending prescription orders can be rejected.',
      );
    }

    const updated = await this.prisma.pharmacyOrder.update({
      where: { id: orderId },
      data: {
        status: ORDER_STATUS.REJECTED as any,
        paymentStatus: PAYMENT_STATUS.UNPAID,
        notes: dto.reason,
        subtotal: null,
        deliveryFee: null,
        totalAmount: null,
      } as any,
      include: {
        items: true,
        deliveryAddress: true,
        pharmacyPartner: true,
      },
    });

    await this.safeNotify(existing.patientProfile.userId, {
      title: 'Prescription Rejected',
      message:
        'Your prescription order was rejected. Please upload a clearer prescription.',
      type: 'PRESCRIPTION_ORDER_REJECTED',
      metadata: { orderId: updated.id },
    });

    void this.recordStatusHistory(
      orderId,
      ORDER_STATUS.REJECTED as any,
      actorUserId,
    );

    return this.toResponseDto(updated);
  }

  async payOrder(
    orderId: string,
    userId: string,
  ): Promise<PharmacyOrderResponseDto> {
    this.assertPrescriptionFlowEnabled();
    const patient = await this.getPatientProfile(userId);

    const existing = await this.prisma.pharmacyOrder.findFirst({
      where: {
        id: orderId,
        patientProfileId: patient.id,
      },
      include: {
        items: true,
        deliveryAddress: true,
        pharmacyPartner: true,
        patientProfile: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Pharmacy order not found');
    }
    if ((existing.status as string) !== ORDER_STATUS.APPROVED) {
      throw new BadRequestException('Order is not approved for payment yet.');
    }
    if ((existing as any).paymentStatus === PAYMENT_STATUS.PAID) {
      throw new BadRequestException('Order is already paid.');
    }
    if (existing.totalAmount == null) {
      throw new BadRequestException(
        'Order total is not available for payment.',
      );
    }
    if (!existing.pharmacyPartner) {
      throw new BadRequestException(
        'Order is missing assigned pharmacy partner.',
      );
    }
    if (!existing.items || existing.items.length === 0) {
      throw new BadRequestException(
        'Order has no medicines to place with partner.',
      );
    }

    const provider = this.resolveProvider(
      existing.pharmacyPartner.code,
      existing.pharmacyPartner.name,
    );
    const partnerResult = await provider.createOrder({
      patientId: patient.id,
      items: existing.items.map((item) => ({
        medicineCode: item.medicineCode,
        medicineName: item.medicineName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      deliveryAddress: this.formatAddress(existing.deliveryAddress),
    });

    const mappedStatus = this.mapPartnerStatus(partnerResult.status);

    const updated = await this.prisma.pharmacyOrder.update({
      where: { id: orderId },
      data: {
        paymentStatus: PAYMENT_STATUS.PAID,
        status: mappedStatus,
        partnerOrderId: partnerResult.partnerOrderId,
      } as any,
      include: {
        items: true,
        deliveryAddress: true,
        pharmacyPartner: true,
      },
    });

    void this.recordStatusHistory(orderId, mappedStatus, userId);

    return this.toResponseDto(updated);
  }

  private calculateDeliveryFee(subtotal: number): number {
    if (subtotal >= PharmacyOrderService.FREE_DELIVERY_THRESHOLD) {
      return 0;
    }

    const tier = PharmacyOrderService.DELIVERY_FEE_TIERS.find(
      ({ minSubtotal }) => subtotal >= minSubtotal,
    );

    return tier?.fee ?? 20;
  }

  async getOrder(
    orderId: string,
    userId: string,
  ): Promise<PharmacyOrderResponseDto> {
    const patient = await this.getPatientProfile(userId);

    const order = await this.prisma.pharmacyOrder.findFirst({
      where: { id: orderId, patientProfileId: patient.id },
      include: {
        items: true,
        deliveryAddress: true,
        pharmacyPartner: true,
      },
    });
    if (!order) throw new NotFoundException('Pharmacy order not found');

    return this.toResponseDto(order);
  }

  async refreshOrderStatus(
    orderId: string,
    userId: string,
  ): Promise<PharmacyOrderResponseDto> {
    const patient = await this.getPatientProfile(userId);

    const order = await this.prisma.pharmacyOrder.findFirst({
      where: { id: orderId, patientProfileId: patient.id },
      include: {
        items: true,
        deliveryAddress: true,
        pharmacyPartner: true,
      },
    });
    if (!order) throw new NotFoundException('Pharmacy order not found');
    if (!order.partnerOrderId) {
      return this.toResponseDto(order);
    }

    const provider = this.resolveProvider(
      order.pharmacyPartner.code,
      order.pharmacyPartner.name,
    );

    let partnerStatus = order.status;
    try {
      const result = await provider.getOrderStatus(order.partnerOrderId);
      partnerStatus = this.mapPartnerStatus(result.status);
    } catch (err) {
      this.logger.warn(
        `Failed to fetch status from partner for order ${orderId}: ${(err as Error).message}`,
      );
    }

    if (partnerStatus !== order.status) {
      const updated = await this.prisma.pharmacyOrder.update({
        where: { id: orderId },
        data: { status: partnerStatus },
        include: {
          items: true,
          deliveryAddress: true,
          pharmacyPartner: true,
        },
      });
      return this.toResponseDto(updated);
    }

    return this.toResponseDto(order);
  }

  async cancelOrder(
    orderId: string,
    userId: string,
  ): Promise<PharmacyOrderResponseDto> {
    const patient = await this.getPatientProfile(userId);

    const order = await this.prisma.pharmacyOrder.findFirst({
      where: { id: orderId, patientProfileId: patient.id },
      include: {
        items: true,
        deliveryAddress: true,
        pharmacyPartner: true,
      },
    });
    if (!order) {
      throw new NotFoundException('Pharmacy order not found');
    }
    if (!this.canCancel(order.status)) {
      throw new BadRequestException('This order can no longer be cancelled');
    }

    let nextStatus: PharmacyOrderStatus = PharmacyOrderStatus.CANCELLED;
    if (order.partnerOrderId) {
      const provider = this.resolveProvider(
        order.pharmacyPartner.code,
        order.pharmacyPartner.name,
      );
      const result = await provider.cancelOrder(order.partnerOrderId);
      nextStatus = this.mapPartnerStatus(result.status);
    }

    const updated = await this.prisma.pharmacyOrder.update({
      where: { id: order.id },
      data: { status: nextStatus },
      include: {
        items: true,
        deliveryAddress: true,
        pharmacyPartner: true,
      },
    });

    return this.toResponseDto(updated);
  }

  async listPatientOrders(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: PharmacyOrderResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const patient = await this.getPatientProfile(userId);

    const where: Prisma.PharmacyOrderWhereInput = {
      patientProfileId: patient.id,
    };
    const [orders, total] = await Promise.all([
      this.prisma.pharmacyOrder.findMany({
        where,
        include: {
          items: true,
          deliveryAddress: true,
          pharmacyPartner: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.pharmacyOrder.count({ where }),
    ]);

    return {
      data: orders.map((order) => this.toResponseDto(order)),
      total,
      page,
      limit,
    };
  }

  private async getPatientProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user || user.role !== Role.PATIENT) {
      throw new BadRequestException('Patient account required');
    }

    const patient = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });
    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }
    return patient;
  }

  private resolveProvider(
    partnerCode: string,
    partnerName: string,
  ): PharmacyPartnerProvider {
    const provider = this.partnerProviders.get(partnerCode.toLowerCase());
    if (provider) {
      return provider;
    }

    const fallback = this.partnerProviders.get(partnerName.toLowerCase());
    if (fallback) {
      return fallback;
    }

    const mock = this.partnerProviders.get('mock');
    if (mock) {
      this.logger.warn(
        `No provider registered for partner "${partnerCode}" / "${partnerName}", falling back to mock`,
      );
      return mock;
    }

    throw new BadRequestException(
      `No pharmacy provider available for partner: ${partnerCode}`,
    );
  }

  private mapPartnerStatus(partnerStatus: string): PharmacyOrderStatus {
    const normalized = partnerStatus.toUpperCase();
    const statusMap: Record<string, PharmacyOrderStatus> = {
      PLACED: PharmacyOrderStatus.PENDING,
      PENDING: PharmacyOrderStatus.PENDING,
      PRESCRIPTION_REVIEW: PharmacyOrderStatus.PRESCRIPTION_REVIEW,
      CONFIRMED: PharmacyOrderStatus.CONFIRMED,
      PACKED: PharmacyOrderStatus.PACKED,
      SHIPPED: PharmacyOrderStatus.SHIPPED,
      OUT_FOR_DELIVERY: PharmacyOrderStatus.OUT_FOR_DELIVERY,
      DELIVERED: PharmacyOrderStatus.DELIVERED,
      CANCELLED: PharmacyOrderStatus.CANCELLED,
      RETURNED: PharmacyOrderStatus.RETURNED,
      REFUNDED: PharmacyOrderStatus.REFUNDED,
    };

    return statusMap[normalized] ?? PharmacyOrderStatus.PENDING;
  }

  private generateOrderNumber(): string {
    return `PHARM-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
  }

  private formatAddress(address: {
    addressLine: string;
    city: string;
    state: string;
    pincode: string;
  }): string {
    // Decrypt is a no-op for legacy plain-text addresses thanks to the
    // `enc:v1:` marker check inside the utility.
    return [
      decrypt(address.addressLine),
      address.city,
      address.state,
      address.pincode,
    ].join(', ');
  }

  private canCancel(status: PharmacyOrderStatus): boolean {
    const cancellableStatuses: PharmacyOrderStatus[] = [
      PharmacyOrderStatus.PENDING,
      PharmacyOrderStatus.PRESCRIPTION_REVIEW,
      ORDER_STATUS.PENDING_APPROVAL as any,
      ORDER_STATUS.APPROVED as any,
      PharmacyOrderStatus.CONFIRMED,
      PharmacyOrderStatus.PACKED,
    ];

    return cancellableStatuses.includes(status);
  }

  private toResponseDto(
    order: PharmacyOrderWithRelations,
  ): PharmacyOrderResponseDto {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      patientProfileId: order.patientProfileId,
      bookingId: order.bookingId,
      prescriptionId: order.prescriptionId,
      uploadedPrescriptionId: order.uploadedPrescriptionId,
      pharmacyPartnerId: order.pharmacyPartnerId,
      partnerCode: order.pharmacyPartner?.code ?? null,
      partnerName:
        order.pharmacyPartner?.displayName ||
        order.pharmacyPartner?.name ||
        null,
      partnerOrderId: order.partnerOrderId,
      status: order.status,
      paymentStatus: (order as any).paymentStatus ?? PAYMENT_STATUS.UNPAID,
      deliveryAddressId: order.deliveryAddressId,
      deliveryAddress: this.formatAddress(order.deliveryAddress),
      prescriptionImageUrl: order.prescriptionImageUrl,
      prescriptionUrl: (order as any).prescriptionUrl ?? null,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      discount: order.discount,
      totalAmount: order.totalAmount,
      estimatedDeliveryAt: order.estimatedDeliveryAt,
      deliveredAt: order.deliveredAt,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((item) => ({
        id: item.id,
        medicineCode: item.medicineCode,
        medicineName: item.medicineName,
        dosage: item.dosage,
        instructions: item.instructions,
        isSubstitute: item.isSubstitute,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
    };
  }

  private async resolveOrderAddress(
    userId: string,
    deliveryAddressId?: string,
  ) {
    if (deliveryAddressId) {
      const address = await this.prisma.address.findFirst({
        where: {
          id: deliveryAddressId,
          userId,
        },
      });
      if (!address) {
        throw new NotFoundException('Delivery address not found');
      }
      return address;
    }

    const fallbackAddress = await this.prisma.address.findFirst({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });

    if (!fallbackAddress) {
      throw new BadRequestException(
        'Delivery address is required. Please add an address first.',
      );
    }

    return fallbackAddress;
  }

  private assertPrescriptionFlowEnabled(): void {
    if (!FeatureFlags.isPrescriptionFlowEnabled()) {
      throw new ServiceUnavailableException(
        'Prescription approval/payment flow is currently disabled. Set ENABLE_PRESCRIPTION_FLOW=true to enable.',
      );
    }
  }

  private async safeNotify(
    userId: string,
    payload: {
      title: string;
      message: string;
      type: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    if (!this.notificationsService) {
      return;
    }

    try {
      await this.notificationsService.createNotification({
        userId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        metadata: payload.metadata ?? {},
      });
    } catch (error) {
      this.logger.warn(
        `Failed to create pharmacy notification for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async recordStatusHistory(
    pharmacyOrderId: string,
    status: PharmacyOrderStatus,
    sourceActorId: string,
  ): Promise<void> {
    try {
      await this.prisma.pharmacyOrderStatusHistory.create({
        data: {
          pharmacyOrderId,
          status,
          source: `manual:${sourceActorId}`,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Unable to write order status history for ${pharmacyOrderId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

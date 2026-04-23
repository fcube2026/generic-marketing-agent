import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PharmacyOrderStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePharmacyOrderDto } from './dto/create-pharmacy-order.dto';
import { PharmacyOrderResponseDto } from './dto/pharmacy-order-response.dto';
import { PharmacyPartnerProvider } from './providers/pharmacy-partner.interface';
import { PrescriptionService } from '../prescription/prescription.service';
import { encrypt, decrypt } from '../../common/utils/encryption.util';

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

  private static readonly MINIMUM_ORDER_SUBTOTAL = 120;

  private static readonly FREE_DELIVERY_THRESHOLD = 450;

  private static readonly DELIVERY_FEE_TIERS = [
    { minSubtotal: 250, fee: 25 },
    { minSubtotal: 120, fee: 40 },
  ] as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly partnerProviders: Map<string, PharmacyPartnerProvider>,
    private readonly prescriptionService: PrescriptionService,
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
    this.assertMinimumOrderSubtotal(subtotal);
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

  private assertMinimumOrderSubtotal(subtotal: number): void {
    if (subtotal < PharmacyOrderService.MINIMUM_ORDER_SUBTOTAL) {
      throw new BadRequestException('Minimum order amount is Rs 120');
    }
  }

  private calculateDeliveryFee(subtotal: number): number {
    this.assertMinimumOrderSubtotal(subtotal);

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
      partnerCode: order.pharmacyPartner.code,
      partnerName:
        order.pharmacyPartner.displayName || order.pharmacyPartner.name,
      partnerOrderId: order.partnerOrderId,
      status: order.status,
      deliveryAddressId: order.deliveryAddressId,
      deliveryAddress: this.formatAddress(order.deliveryAddress),
      prescriptionImageUrl: order.prescriptionImageUrl,
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
}

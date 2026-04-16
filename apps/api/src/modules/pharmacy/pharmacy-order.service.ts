import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePharmacyOrderDto } from './dto/create-pharmacy-order.dto';
import { PharmacyOrderResponseDto } from './dto/pharmacy-order-response.dto';
import { PharmacyPartnerProvider } from './providers/pharmacy-partner.interface';

@Injectable()
export class PharmacyOrderService {
  private readonly logger = new Logger(PharmacyOrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly partnerProviders: Map<string, PharmacyPartnerProvider>,
  ) {}

  async placeOrder(
    userId: string,
    dto: CreatePharmacyOrderDto,
  ): Promise<PharmacyOrderResponseDto> {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });
    if (!patient) throw new NotFoundException('Patient profile not found');

    const partner = await this.prisma.pharmacyPartner.findUnique({
      where: { id: dto.partnerId },
    });
    if (!partner || !partner.isActive) {
      throw new BadRequestException('Pharmacy partner not found or inactive');
    }

    const provider = this.resolveProvider(partner.name);

    const partnerResult = await provider.createOrder(
      patient.id,
      dto.items.map((i) => ({
        medicineId: i.medicineId,
        medicineName: i.medicineName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      dto.deliveryAddress,
    );

    const order = await this.prisma.pharmacyOrder.create({
      data: {
        patientId: patient.id,
        bookingId: dto.bookingId ?? null,
        prescriptionId: dto.prescriptionId ?? null,
        partnerId: partner.id,
        partnerOrderId: partnerResult.partnerOrderId,
        status: 'PLACED',
        deliveryAddress: dto.deliveryAddress,
        totalAmount: partnerResult.totalAmount,
        notes: dto.notes ?? null,
        items: {
          create: dto.items.map((i) => ({
            medicineId: i.medicineId,
            medicineName: i.medicineName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.unitPrice * i.quantity,
          })),
        },
      },
      include: { items: true },
    });

    return order as PharmacyOrderResponseDto;
  }

  async getOrder(
    orderId: string,
    userId: string,
  ): Promise<PharmacyOrderResponseDto> {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });
    if (!patient) throw new NotFoundException('Patient profile not found');

    const order = await this.prisma.pharmacyOrder.findFirst({
      where: { id: orderId, patientId: patient.id },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Pharmacy order not found');

    return order as PharmacyOrderResponseDto;
  }

  async refreshOrderStatus(
    orderId: string,
    userId: string,
  ): Promise<PharmacyOrderResponseDto> {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });
    if (!patient) throw new NotFoundException('Patient profile not found');

    const order = await this.prisma.pharmacyOrder.findFirst({
      where: { id: orderId, patientId: patient.id },
      include: { items: true, partner: true },
    });
    if (!order) throw new NotFoundException('Pharmacy order not found');
    if (!order.partnerOrderId) {
      return order as PharmacyOrderResponseDto;
    }

    const provider = this.resolveProvider(order.partner.name);

    let partnerStatus: string = order.status;
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
        data: { status: partnerStatus as any },
        include: { items: true },
      });
      return updated as PharmacyOrderResponseDto;
    }

    return order as PharmacyOrderResponseDto;
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
    const patient = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });
    if (!patient) return { data: [], total: 0, page, limit };

    const where = { patientId: patient.id };
    const [orders, total] = await Promise.all([
      this.prisma.pharmacyOrder.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.pharmacyOrder.count({ where }),
    ]);

    return { data: orders as PharmacyOrderResponseDto[], total, page, limit };
  }

  private resolveProvider(partnerName: string): PharmacyPartnerProvider {
    const provider = this.partnerProviders.get(partnerName.toLowerCase());
    if (!provider) {
      this.logger.warn(
        `No provider registered for partner "${partnerName}", falling back to mock`,
      );
      const mock = this.partnerProviders.get('mock');
      if (!mock) {
        throw new BadRequestException(
          `No pharmacy provider available for partner: ${partnerName}`,
        );
      }
      return mock;
    }
    return provider;
  }

  private mapPartnerStatus(partnerStatus: string): string {
    const statusMap: Record<string, string> = {
      PLACED: 'PLACED',
      CONFIRMED: 'CONFIRMED',
      PACKED: 'PACKED',
      SHIPPED: 'SHIPPED',
      DELIVERED: 'DELIVERED',
      CANCELLED: 'CANCELLED',
      RETURNED: 'RETURNED',
      // PharmEasy-specific aliases
      pending: 'PLACED',
      confirmed: 'CONFIRMED',
      shipped: 'SHIPPED',
      delivered: 'DELIVERED',
      cancelled: 'CANCELLED',
    };
    return statusMap[partnerStatus] ?? partnerStatus.toUpperCase();
  }
}

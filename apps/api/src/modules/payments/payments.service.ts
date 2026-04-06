import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreatePaymentDto,
  UpdatePaymentStatusDto,
} from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async initiatePayment(dto: CreatePaymentDto, _userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const existing = await this.prisma.payment.findUnique({
      where: { bookingId: dto.bookingId },
    });
    if (existing) {
      return existing;
    }

    // Mock payment initiation
    return this.prisma.payment.create({
      data: {
        bookingId: dto.bookingId,
        amount: dto.amount,
        status: 'PENDING',
        transactionId: `TXN_${Date.now()}`,
      },
    });
  }

  async getPaymentStatus(bookingId: string, _userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { bookingId },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async updatePaymentStatus(
    id: string,
    dto: UpdatePaymentStatusDto,
    _userId: string,
  ) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');

    const updated = await this.prisma.payment.update({
      where: { id },
      data: {
        status: dto.status as any,
        transactionId: dto.transactionId,
        ...(dto.status === 'PAID' && { paidAt: new Date() }),
      },
    });

    if (dto.status === 'PAID') {
      await this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { paymentStatus: 'PAID' },
      });

      const booking = await this.prisma.booking.findUnique({
        where: { id: payment.bookingId },
      });
      if (booking) {
        const providerCut = booking.totalFee * 0.8;
        await this.prisma.payout.upsert({
          where: { bookingId: payment.bookingId },
          create: {
            providerId: booking.providerId,
            bookingId: payment.bookingId,
            amount: providerCut,
            status: 'PENDING',
          },
          update: { amount: providerCut },
        });
      }
    }

    if (dto.status === 'REFUNDED' || dto.status === 'FAILED') {
      await this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { paymentStatus: dto.status as any },
      });
    }

    return updated;
  }
}

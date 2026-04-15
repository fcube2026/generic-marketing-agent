import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreatePaymentDto,
  UpdatePaymentStatusDto,
} from './dto/create-payment.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

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

    // Get booking details for notifications
    const booking = await this.prisma.booking.findUnique({
      where: { id: payment.bookingId },
      include: { patient: true, provider: true },
    });

    if (dto.status === 'PAID') {
      await this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { paymentStatus: 'PAID' },
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

        // Notify patient of successful payment
        await this.notificationsService.sendNotification(
          {
            userId: booking.patient.userId,
            title: 'Payment Successful',
            message: `Your payment of ₹${payment.amount} has been received.`,
            type: 'PAYMENT_SUCCESS',
            metadata: { bookingId: payment.bookingId, amount: payment.amount },
          },
          {
            inApp: true,
            push: true,
            sms: true,
            smsTemplate: 'PAYMENT_SUCCESS',
            smsParams: { amount: String(payment.amount) },
          },
        );

        // Notify provider of payment received
        await this.notificationsService.sendNotification(
          {
            userId: booking.provider.userId,
            title: 'Payment Received',
            message: `Payment of ₹${payment.amount} received for booking.`,
            type: 'PAYMENT_RECEIVED',
            metadata: { bookingId: payment.bookingId, amount: payment.amount },
          },
          {
            inApp: true,
            push: true,
            sms: false, // Don't spam provider with SMS for each payment
          },
        );
      }
    }

    if (dto.status === 'REFUNDED' || dto.status === 'FAILED') {
      await this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { paymentStatus: dto.status as any },
      });

      if (booking && dto.status === 'REFUNDED') {
        // Notify patient of refund
        await this.notificationsService.sendNotification(
          {
            userId: booking.patient.userId,
            title: 'Refund Processed',
            message: `Your refund of ₹${payment.amount} has been processed.`,
            type: 'PAYMENT_REFUNDED',
            metadata: { bookingId: payment.bookingId, amount: payment.amount },
          },
          {
            inApp: true,
            push: true,
            sms: true,
            smsTemplate: 'REFUND_PROCESSED',
            smsParams: { amount: String(payment.amount) },
          },
        );
      }
    }

    return updated;
  }
}

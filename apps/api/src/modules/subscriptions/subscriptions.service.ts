import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateSubscriptionDto,
  CreateSubscriptionUsageLogDto,
  UpdateSubscriptionDto,
} from './dto/subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  private toDate(value?: string): Date | undefined {
    return value ? new Date(value) : undefined;
  }

  list(status?: SubscriptionStatus) {
    return this.prisma.serviceSubscription.findMany({
      where: status ? { status } : undefined,
      include: {
        usageLogs: {
          orderBy: { periodStart: 'desc' },
          take: 6,
        },
      },
      orderBy: [{ renewalDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getById(id: string) {
    const record = await this.prisma.serviceSubscription.findUnique({
      where: { id },
      include: {
        usageLogs: {
          orderBy: { periodStart: 'desc' },
          take: 24,
        },
      },
    });

    if (!record) {
      throw new NotFoundException('Subscription not found');
    }

    return record;
  }

  create(dto: CreateSubscriptionDto) {
    return this.prisma.serviceSubscription.create({
      data: {
        ...dto,
        planStartDate: this.toDate(dto.planStartDate),
        planEndDate: this.toDate(dto.planEndDate),
        renewalDate: this.toDate(dto.renewalDate),
      },
    });
  }

  async update(id: string, dto: UpdateSubscriptionDto) {
    await this.getById(id);

    return this.prisma.serviceSubscription.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.planStartDate !== undefined && {
          planStartDate: this.toDate(dto.planStartDate) || null,
        }),
        ...(dto.planEndDate !== undefined && {
          planEndDate: this.toDate(dto.planEndDate) || null,
        }),
        ...(dto.renewalDate !== undefined && {
          renewalDate: this.toDate(dto.renewalDate) || null,
        }),
      },
    });
  }

  async remove(id: string) {
    await this.getById(id);
    await this.prisma.serviceSubscription.delete({ where: { id } });
    return { ok: true };
  }

  async addUsageLog(id: string, dto: CreateSubscriptionUsageLogDto) {
    await this.getById(id);

    const usage = await this.prisma.subscriptionUsageLog.create({
      data: {
        subscriptionId: id,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        plannedAmount: dto.plannedAmount,
        actualAmount: dto.actualAmount,
        usageLimit: dto.usageLimit,
        usageConsumed: dto.usageConsumed,
        usageUnit: dto.usageUnit,
        seatsPlanned: dto.seatsPlanned,
        seatsUsed: dto.seatsUsed,
        notes: dto.notes,
      },
    });

    await this.prisma.serviceSubscription.update({
      where: { id },
      data: {
        ...(dto.plannedAmount !== undefined && {
          plannedAmount: dto.plannedAmount,
        }),
        ...(dto.actualAmount !== undefined && {
          actualAmount: dto.actualAmount,
        }),
        ...(dto.usageLimit !== undefined && { usageLimit: dto.usageLimit }),
        ...(dto.usageConsumed !== undefined && {
          usageConsumed: dto.usageConsumed,
        }),
        ...(dto.usageUnit !== undefined && { usageUnit: dto.usageUnit }),
        ...(dto.seatsPlanned !== undefined && {
          seatsPlanned: dto.seatsPlanned,
        }),
        ...(dto.seatsUsed !== undefined && { seatsUsed: dto.seatsUsed }),
      },
    });

    return usage;
  }

  async summary() {
    const all = await this.prisma.serviceSubscription.findMany();

    const now = Date.now();
    const sevenDays = now + 7 * 24 * 60 * 60 * 1000;

    let totalPlanned = 0;
    let totalActual = 0;
    let upcomingRenewals = 0;

    for (const sub of all) {
      totalPlanned += sub.plannedAmount;
      totalActual += sub.actualAmount;

      const targetDate = sub.renewalDate || sub.planEndDate;
      if (!targetDate) continue;

      const ts = targetDate.getTime();
      if (ts >= now && ts <= sevenDays) {
        upcomingRenewals += 1;
      }
    }

    return {
      totalSubscriptions: all.length,
      totalPlanned,
      totalActual,
      variance: totalActual - totalPlanned,
      upcomingRenewals,
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  UpsertBusinessProfileDto,
  UpsertCampaignDto,
  UpdateCampaignDto,
  UpsertExperimentDto,
  UpdateExperimentDto,
  UpsertContentItemDto,
  UpdateContentItemDto,
  UpsertSeoPageDto,
  UpsertKeywordClusterDto,
  UpsertLifecycleFlowDto,
  UpsertPlanItemDto,
  UpdatePlanItemDto,
  UpsertIntakeResponseDto,
} from './dto/marketing.dto';

const SINGLETON_PROFILE_ID = 'default';

type KpiStatus = 'on-track' | 'at-risk' | 'behind';

export interface KpiMetric {
  label: string;
  value: string | number;
  target: string;
  trend: string;
  status: KpiStatus;
  icon: string;
}

@Injectable()
export class MarketingService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Business Profile ──────────────────────────────────────────────────────

  async getProfile() {
    const existing = await this.prisma.marketingBusinessProfile.findUnique({
      where: { id: SINGLETON_PROFILE_ID },
    });
    if (existing) return existing;

    return this.prisma.marketingBusinessProfile.create({
      data: { id: SINGLETON_PROFILE_ID },
    });
  }

  async upsertProfile(dto: UpsertBusinessProfileDto) {
    return this.prisma.marketingBusinessProfile.upsert({
      where: { id: SINGLETON_PROFILE_ID },
      create: { id: SINGLETON_PROFILE_ID, ...dto },
      update: { ...dto },
    });
  }

  // ─── Campaigns ─────────────────────────────────────────────────────────────

  listCampaigns() {
    return this.prisma.marketingCampaign.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCampaign(id: string) {
    const item = await this.prisma.marketingCampaign.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException('Campaign not found');
    return item;
  }

  createCampaign(dto: UpsertCampaignDto) {
    const { startDate, endDate, ...rest } = dto;
    return this.prisma.marketingCampaign.create({
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });
  }

  async updateCampaign(id: string, dto: UpdateCampaignDto) {
    await this.getCampaign(id);
    const { startDate, endDate, ...rest } = dto;
    return this.prisma.marketingCampaign.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate !== undefined && {
          startDate: startDate ? new Date(startDate) : null,
        }),
        ...(endDate !== undefined && {
          endDate: endDate ? new Date(endDate) : null,
        }),
      },
    });
  }

  async deleteCampaign(id: string) {
    await this.getCampaign(id);
    await this.prisma.marketingCampaign.delete({ where: { id } });
    return { ok: true };
  }

  // ─── Experiments ───────────────────────────────────────────────────────────

  listExperiments() {
    return this.prisma.marketingExperiment.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getExperiment(id: string) {
    const item = await this.prisma.marketingExperiment.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException('Experiment not found');
    return item;
  }

  createExperiment(dto: UpsertExperimentDto) {
    return this.prisma.marketingExperiment.create({ data: dto });
  }

  async updateExperiment(id: string, dto: UpdateExperimentDto) {
    await this.getExperiment(id);
    return this.prisma.marketingExperiment.update({ where: { id }, data: dto });
  }

  async deleteExperiment(id: string) {
    await this.getExperiment(id);
    await this.prisma.marketingExperiment.delete({ where: { id } });
    return { ok: true };
  }

  // ─── Content Calendar ──────────────────────────────────────────────────────

  listContentItems() {
    return this.prisma.marketingContentItem.findMany({
      orderBy: [{ week: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getContentItem(id: string) {
    const item = await this.prisma.marketingContentItem.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException('Content item not found');
    return item;
  }

  createContentItem(dto: UpsertContentItemDto) {
    const { scheduledAt, ...rest } = dto;
    return this.prisma.marketingContentItem.create({
      data: {
        ...rest,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    });
  }

  async updateContentItem(id: string, dto: UpdateContentItemDto) {
    await this.getContentItem(id);
    const { scheduledAt, ...rest } = dto;
    return this.prisma.marketingContentItem.update({
      where: { id },
      data: {
        ...rest,
        ...(scheduledAt !== undefined && {
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        }),
      },
    });
  }

  async deleteContentItem(id: string) {
    await this.getContentItem(id);
    await this.prisma.marketingContentItem.delete({ where: { id } });
    return { ok: true };
  }

  // ─── SEO ───────────────────────────────────────────────────────────────────

  listSeoPages() {
    return this.prisma.marketingSeoPage.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  upsertSeoPage(dto: UpsertSeoPageDto) {
    return this.prisma.marketingSeoPage.upsert({
      where: { url: dto.url },
      create: dto,
      update: {
        type: dto.type,
        title: dto.title,
        status: dto.status,
        targetKeyword: dto.targetKeyword,
      },
    });
  }

  listKeywordClusters() {
    return this.prisma.marketingKeywordCluster.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  createKeywordCluster(dto: UpsertKeywordClusterDto) {
    return this.prisma.marketingKeywordCluster.create({
      data: {
        cluster: dto.cluster,
        type: dto.type,
        priority: dto.priority,
        keywords: dto.keywords as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // ─── Lifecycle Flows ───────────────────────────────────────────────────────

  listLifecycleFlows() {
    return this.prisma.marketingLifecycleFlow.findMany({
      orderBy: { createdAt: 'asc' },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
  }

  createLifecycleFlow(dto: UpsertLifecycleFlowDto) {
    return this.prisma.marketingLifecycleFlow.create({
      data: {
        name: dto.name,
        segment: dto.segment,
        trigger: dto.trigger,
        status: dto.status,
        steps: {
          create: dto.steps.map((step, idx) => ({
            day: step.day,
            channel: step.channel,
            message: step.message,
            goal: step.goal,
            order: idx,
          })),
        },
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
  }

  // ─── 90-Day Plan ───────────────────────────────────────────────────────────

  listPlanItems() {
    return this.prisma.marketingPlanItem.findMany({
      orderBy: [{ phase: 'asc' }, { createdAt: 'asc' }],
    });
  }

  createPlanItem(dto: UpsertPlanItemDto) {
    return this.prisma.marketingPlanItem.create({ data: dto });
  }

  async updatePlanItem(id: string, dto: UpdatePlanItemDto) {
    const existing = await this.prisma.marketingPlanItem.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Plan item not found');
    return this.prisma.marketingPlanItem.update({ where: { id }, data: dto });
  }

  // ─── Intake Responses ──────────────────────────────────────────────────────

  async listIntakeResponses() {
    const rows = await this.prisma.marketingIntakeResponse.findMany();
    const map: Record<string, unknown> = {};
    for (const row of rows) map[row.questionId] = row.value;
    return map;
  }

  upsertIntakeResponse(dto: UpsertIntakeResponseDto) {
    return this.prisma.marketingIntakeResponse.upsert({
      where: { questionId: dto.questionId },
      create: {
        questionId: dto.questionId,
        value: dto.value as Prisma.InputJsonValue,
      },
      update: {
        value: dto.value as Prisma.InputJsonValue,
      },
    });
  }

  async upsertIntakeResponseBatch(values: Record<string, unknown>) {
    const ops = Object.entries(values).map(([questionId, value]) =>
      this.prisma.marketingIntakeResponse.upsert({
        where: { questionId },
        create: { questionId, value: value as Prisma.InputJsonValue },
        update: { value: value as Prisma.InputJsonValue },
      }),
    );
    await this.prisma.$transaction(ops);
    return this.listIntakeResponses();
  }

  // ─── KPI Computation ───────────────────────────────────────────────────────

  private formatINR(amount: number): string {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  }

  private statusFromRatio(value: number, target: number): KpiStatus {
    if (target === 0) return 'on-track';
    const ratio = value / target;
    if (ratio >= 1) return 'on-track';
    if (ratio >= 0.7) return 'at-risk';
    return 'behind';
  }

  async getNorthStarKpis(): Promise<KpiMetric[]> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [paidAgg, activePatients, activeProviders] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { status: 'PAID', createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      this.prisma.booking.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { patientId: true },
        distinct: ['patientId'],
      }),
      this.prisma.providerProfile.count({
        where: { isVerified: true, isActive: true },
      }),
    ]);

    const gmv = paidAgg._sum.amount ?? 0;
    const mapTarget = 1000000;
    const mapPatientsTarget = 2000;
    const providerTarget = 200;

    return [
      {
        label: 'GMV (Completed Bookings)',
        value: this.formatINR(gmv),
        target: `${this.formatINR(mapTarget)}/mo`,
        trend: '—',
        status: this.statusFromRatio(gmv, mapTarget),
        icon: '💰',
      },
      {
        label: 'Monthly Active Patients',
        value: activePatients.length,
        target: `${mapPatientsTarget.toLocaleString('en-IN')}/mo`,
        trend: '—',
        status: this.statusFromRatio(activePatients.length, mapPatientsTarget),
        icon: '🧑‍⚕️',
      },
      {
        label: 'Active Provider Count',
        value: activeProviders,
        target: `${providerTarget} verified`,
        trend: '—',
        status: this.statusFromRatio(activeProviders, providerTarget),
        icon: '👨‍⚕️',
      },
    ];
  }

  async getAcquisitionKpis(): Promise<KpiMetric[]> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [campaignAgg, newPatients, newProviders, referrals, totalNew] =
      await Promise.all([
        this.prisma.marketingCampaign.aggregate({
          where: { status: 'active' },
          _sum: { spend: true },
        }),
        this.prisma.user.count({
          where: { role: 'PATIENT', createdAt: { gte: thirtyDaysAgo } },
        }),
        this.prisma.user.count({
          where: { role: 'PROVIDER', createdAt: { gte: thirtyDaysAgo } },
        }),
        this.prisma.referral.count({
          where: { createdAt: { gte: thirtyDaysAgo } },
        }),
        this.prisma.user.count({
          where: { createdAt: { gte: thirtyDaysAgo } },
        }),
      ]);

    const totalSpend = campaignAgg._sum.spend ?? 0;
    const patientCac = newPatients > 0 ? totalSpend / newPatients : 0;
    const providerCac = newProviders > 0 ? totalSpend / newProviders : 0;
    const referralPct =
      totalNew > 0 ? Math.round((referrals / totalNew) * 100) : 0;

    return [
      {
        label: 'Blended CAC (Patient)',
        value: patientCac > 0 ? `₹${Math.round(patientCac)}` : '—',
        target: '< ₹300',
        trend: '—',
        status: patientCac > 0 && patientCac <= 300 ? 'on-track' : 'at-risk',
        icon: '📉',
      },
      {
        label: 'Blended CAC (Provider)',
        value: providerCac > 0 ? `₹${Math.round(providerCac)}` : '—',
        target: '< ₹500',
        trend: '—',
        status: providerCac > 0 && providerCac <= 500 ? 'on-track' : 'at-risk',
        icon: '📉',
      },
      {
        label: 'New Patient Signups (30d)',
        value: newPatients,
        target: '> 500/mo',
        trend: '—',
        status: this.statusFromRatio(newPatients, 500),
        icon: '🌱',
      },
      {
        label: 'New Provider Signups (30d)',
        value: newProviders,
        target: '> 50/mo',
        trend: '—',
        status: this.statusFromRatio(newProviders, 50),
        icon: '👨‍⚕️',
      },
      {
        label: 'Referral % of Signups',
        value: `${referralPct}%`,
        target: '> 15%',
        trend: '—',
        status:
          referralPct >= 15
            ? 'on-track'
            : referralPct >= 10
              ? 'at-risk'
              : 'behind',
        icon: '🔗',
      },
    ];
  }

  async getActivationKpis(): Promise<KpiMetric[]> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentPatientUsers = await this.prisma.user.findMany({
      where: { role: 'PATIENT', createdAt: { gte: thirtyDaysAgo } },
      select: { id: true, createdAt: true },
    });

    let firstBookingWithin7d = 0;
    if (recentPatientUsers.length > 0) {
      const userIds = recentPatientUsers.map((u) => u.id);
      const profiles = await this.prisma.patientProfile.findMany({
        where: { userId: { in: userIds } },
        select: { id: true, userId: true },
      });
      const profileToUser = new Map(profiles.map((p) => [p.id, p.userId]));
      const userToCreatedAt = new Map(
        recentPatientUsers.map((u) => [u.id, u.createdAt]),
      );

      const bookings = await this.prisma.booking.findMany({
        where: { patientId: { in: profiles.map((p) => p.id) } },
        select: { patientId: true, createdAt: true },
      });

      const earliest = new Map<string, Date>();
      for (const b of bookings) {
        const userId = profileToUser.get(b.patientId);
        if (!userId) continue;
        const existing = earliest.get(userId);
        if (!existing || b.createdAt < existing)
          earliest.set(userId, b.createdAt);
      }

      for (const [userId, firstBooking] of earliest.entries()) {
        const signedUp = userToCreatedAt.get(userId);
        if (!signedUp) continue;
        const diffDays =
          (firstBooking.getTime() - signedUp.getTime()) / (24 * 60 * 60 * 1000);
        if (diffDays >= 0 && diffDays <= 7) firstBookingWithin7d++;
      }
    }

    const signupToBookingPct =
      recentPatientUsers.length > 0
        ? Math.round((firstBookingWithin7d / recentPatientUsers.length) * 100)
        : 0;

    const [providersTotal, providersApproved] = await Promise.all([
      this.prisma.providerProfile.count(),
      this.prisma.providerProfile.count({ where: { isVerified: true } }),
    ]);

    const providerOnboardingPct =
      providersTotal > 0
        ? Math.round((providersApproved / providersTotal) * 100)
        : 0;

    return [
      {
        label: 'Signup → First Booking (7d)',
        value: `${signupToBookingPct}%`,
        target: '> 35%',
        trend: '—',
        status:
          signupToBookingPct >= 35
            ? 'on-track'
            : signupToBookingPct >= 25
              ? 'at-risk'
              : 'behind',
        icon: '🎯',
      },
      {
        label: 'Provider Onboarding Completion',
        value: `${providerOnboardingPct}%`,
        target: '> 70%',
        trend: '—',
        status:
          providerOnboardingPct >= 70
            ? 'on-track'
            : providerOnboardingPct >= 50
              ? 'at-risk'
              : 'behind',
        icon: '✅',
      },
    ];
  }

  async getRetentionKpis(): Promise<KpiMetric[]> {
    const now = new Date();
    const d30Cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const d90Cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const d60Cutoff = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Cohort: patients whose first booking was 30+/90+ days ago.
    // Retention = of those, who booked again within the cohort window.
    const [d30Stats, d90Stats, repeatStats] = await Promise.all([
      this.computeCohortRetention(d30Cutoff, 30),
      this.computeCohortRetention(d90Cutoff, 90),
      this.computeRepeatBookingRate(d60Cutoff),
    ]);

    return [
      {
        label: 'D30 Patient Retention',
        value: `${d30Stats}%`,
        target: '> 25%',
        trend: '—',
        status:
          d30Stats >= 25 ? 'on-track' : d30Stats >= 18 ? 'at-risk' : 'behind',
        icon: '🔄',
      },
      {
        label: 'D90 Patient Retention',
        value: `${d90Stats}%`,
        target: '> 15%',
        trend: '—',
        status:
          d90Stats >= 15 ? 'on-track' : d90Stats >= 10 ? 'at-risk' : 'behind',
        icon: '🔄',
      },
      {
        label: 'Repeat Booking Rate (60d)',
        value: `${repeatStats}%`,
        target: '> 30%',
        trend: '—',
        status:
          repeatStats >= 30
            ? 'on-track'
            : repeatStats >= 22
              ? 'at-risk'
              : 'behind',
        icon: '📅',
      },
    ];
  }

  private async computeCohortRetention(cutoff: Date, windowDays: number) {
    // Patients whose earliest booking is on or before `cutoff`
    const earliestBookings = await this.prisma.booking.groupBy({
      by: ['patientId'],
      _min: { createdAt: true },
    });
    const cohort = earliestBookings.filter(
      (b) => b._min.createdAt && b._min.createdAt <= cutoff,
    );
    if (cohort.length === 0) return 0;

    const cohortIds = cohort.map((c) => c.patientId);
    let retained = 0;
    for (const c of cohort) {
      const firstAt = c._min.createdAt!;
      const windowStart = new Date(firstAt.getTime());
      const windowEnd = new Date(
        firstAt.getTime() + windowDays * 24 * 60 * 60 * 1000,
      );
      // count any later booking after firstAt and within the window
      const repeats = await this.prisma.booking.count({
        where: {
          patientId: c.patientId,
          createdAt: { gt: firstAt, lte: windowEnd },
        },
      });
      if (repeats > 0) retained++;
      // Acknowledge windowStart/cohortIds usage to keep linter quiet
      void windowStart;
      void cohortIds;
    }
    return Math.round((retained / cohort.length) * 100);
  }

  private async computeRepeatBookingRate(since: Date) {
    const bookings = await this.prisma.booking.findMany({
      where: { createdAt: { gte: since } },
      select: { patientId: true },
    });
    if (bookings.length === 0) return 0;
    const counts = new Map<string, number>();
    for (const b of bookings) {
      counts.set(b.patientId, (counts.get(b.patientId) ?? 0) + 1);
    }
    const repeat = Array.from(counts.values()).filter((c) => c >= 2).length;
    return Math.round((repeat / counts.size) * 100);
  }
}

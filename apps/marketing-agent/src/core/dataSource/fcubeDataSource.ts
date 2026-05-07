/**
 * `FcubeDataSource` — projects fcube's typed clinical tables onto the
 * marketing-agent's generic `Resource<T>` API, while delegating
 * marketing-only resources (campaigns, experiments, content calendar,
 * SEO pages, lifecycle flows, plan items, profile/intake singletons,
 * …) to the generic `AgentResource` table via the existing
 * `PrismaDataSource`.
 *
 * Read-only resources surfaced from fcube tables:
 *   - `users`           ← User
 *   - `patients`        ← PatientProfile (joined with User)
 *   - `providers`       ← ProviderProfile (joined with User)
 *   - `bookings`        ← Booking
 *   - `pharmacy-orders` ← PharmacyOrder
 *
 * `profile` (singleton) is a hybrid:
 *   - the *editable* part lives in `AgentResource` (so a marketing user
 *     can still set `monthlyBudget`, `targetCities`, etc. through the
 *     Settings UI), and
 *   - live counts (`activeProviders`, `totalPatients`, `monthlyBookings`)
 *     are recomputed on every read from the clinical tables.
 *
 * Writes to clinical resources throw `ReadOnlyDataSourceError` — the
 * marketing dashboard MUST NOT mutate clinical data. Writes to all
 * other resources go through the generic Prisma adapter unchanged.
 *
 * The Prisma client is loaded via a dynamic `import()` of
 * `@curex24/database` inside try/catch so the bundler never resolves it
 * at build time. If `@curex24/database`'s generated client is missing,
 * the factory surfaces a clean `DataSourceNotConfiguredError`.
 */

import type {
  DataSource,
  DataSourceStatus,
  ListOptions,
  ListResult,
  Resource,
} from './types';
import { ReadOnlyDataSourceError } from './types';
import type { TenantContext } from '../tenant/types';
import { PrismaDataSource } from './prismaDataSource';

// ─── Public options ─────────────────────────────────────────────────────────

export interface FcubeOptions {
  /** Postgres connection string — usually `process.env.DATABASE_URL`. */
  datasourceUrl?: string;
  /** Pre-built Prisma client (escape hatch for tests). */
  client?: FcubeClient;
}

const PROFILE_OVERLAY_TYPE = '__profile_overlay__';

/** Resource ids that are surfaced read-only from fcube tables. */
const FCUBE_READONLY_TYPES = new Set<string>([
  'users',
  'patients',
  'providers',
  'bookings',
  'pharmacy-orders',
]);

export class FcubeDataSource implements DataSource {
  readonly status: DataSourceStatus;
  private clientPromise: Promise<FcubeClient> | null = null;
  private readonly delegate: PrismaDataSource;

  constructor(private readonly opts: FcubeOptions = {}) {
    this.status = {
      kind: 'fcube',
      label: 'fcube (Postgres)',
      detail: opts.datasourceUrl
        ? safeMaskUrl(opts.datasourceUrl)
        : process.env.DATABASE_URL
          ? safeMaskUrl(process.env.DATABASE_URL)
          : '<unset DATABASE_URL>',
    };
    this.delegate = new PrismaDataSource({
      datasourceUrl: opts.datasourceUrl,
      modelName: 'agentResource',
    });
  }

  async connect(): Promise<void> {
    // Eagerly resolve both clients so connection failures show up at
    // boot rather than on the first request.
    await this.client();
    if (this.delegate.connect) await this.delegate.connect();
  }

  async disconnect(): Promise<void> {
    if (this.clientPromise) {
      try {
        const c = await this.clientPromise;
        if (typeof c.$disconnect === 'function') await c.$disconnect();
      } catch {
        /* swallow — best-effort */
      }
    }
    if (this.delegate.disconnect) await this.delegate.disconnect();
  }

  // ─── DataSource API ──────────────────────────────────────────────────────

  async get<T>(ctx: TenantContext, type: string, id: string): Promise<Resource<T> | null> {
    if (FCUBE_READONLY_TYPES.has(type)) {
      const c = await this.client();
      const data = await fetchOneFromFcube(c, type, id);
      if (!data) return null;
      return projectResource<T>(ctx.tenant.id, type, id, data);
    }
    return this.delegate.get<T>(ctx, type, id);
  }

  async list<T>(
    ctx: TenantContext,
    type: string,
    opts: ListOptions = {},
  ): Promise<ListResult<T>> {
    if (FCUBE_READONLY_TYPES.has(type)) {
      const c = await this.client();
      const rows = await fetchManyFromFcube(c, type, opts);
      const items = rows.map((row) =>
        projectResource<T>(ctx.tenant.id, type, String(row.id), row),
      );
      return { items };
    }
    return this.delegate.list<T>(ctx, type, opts);
  }

  async create<T>(
    ctx: TenantContext,
    type: string,
    data: T,
    id?: string,
  ): Promise<Resource<T>> {
    if (FCUBE_READONLY_TYPES.has(type)) throw new ReadOnlyDataSourceError(type);
    return this.delegate.create<T>(ctx, type, data, id);
  }

  async update<T>(
    ctx: TenantContext,
    type: string,
    id: string,
    patch: Partial<T>,
  ): Promise<Resource<T> | null> {
    if (FCUBE_READONLY_TYPES.has(type)) throw new ReadOnlyDataSourceError(type);
    return this.delegate.update<T>(ctx, type, id, patch);
  }

  async delete(ctx: TenantContext, type: string, id: string): Promise<boolean> {
    if (FCUBE_READONLY_TYPES.has(type)) throw new ReadOnlyDataSourceError(type);
    return this.delegate.delete(ctx, type, id);
  }

  async getSingleton<T>(ctx: TenantContext, type: string): Promise<T | null> {
    if (type === 'profile') {
      const overlay = (await this.delegate.getSingleton<Record<string, unknown>>(
        ctx,
        PROFILE_OVERLAY_TYPE,
      )) ?? {};
      const live = await this.computeProfileFromFcube();
      return { ...live, ...overlay } as T;
    }
    return this.delegate.getSingleton<T>(ctx, type);
  }

  async putSingleton<T>(ctx: TenantContext, type: string, data: T): Promise<T> {
    if (type === 'profile') {
      // Only the editable part of the profile is persisted; live counts
      // are recomputed on read so they're always current.
      const overlay = stripLiveProfileFields(data as Record<string, unknown>);
      await this.delegate.putSingleton(ctx, PROFILE_OVERLAY_TYPE, overlay);
      return (await this.getSingleton<T>(ctx, 'profile')) as T;
    }
    return this.delegate.putSingleton<T>(ctx, type, data);
  }

  // ─── KPI computation ─────────────────────────────────────────────────────

  async computeKpis(_ctx: TenantContext): Promise<Record<string, string | number>> {
    void _ctx; // multi-tenant scoping isn't applicable to fcube tables
    const c = await this.client();
    const now = new Date();
    const startOf30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOf7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOf90d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [
      activeProviders,
      newSignups30d,
      monthlyActivePatients,
      weeklyBookings,
      bookings30d,
      bookings90d,
      patients30d,
      onboardedPatients,
    ] = await Promise.all([
      c.providerProfile.count({ where: { isActive: true } }),
      c.user.count({ where: { createdAt: { gte: startOf30d } } }),
      c.booking
        .findMany({
          where: { createdAt: { gte: startOf30d } },
          select: { patientId: true },
          distinct: ['patientId'],
        })
        .then((rows) => rows.length),
      c.booking.count({ where: { createdAt: { gte: startOf7d } } }),
      c.booking.count({ where: { createdAt: { gte: startOf30d } } }),
      c.booking.count({ where: { createdAt: { gte: startOf90d } } }),
      c.patientProfile.count({ where: { createdAt: { gte: startOf30d } } }),
      c.patientProfile.count({ where: { totalBookings: { gt: 0 } } }),
    ]);

    const onboardingRatePct =
      patients30d > 0 ? Math.round((onboardedPatients / patients30d) * 100) : 0;
    // Retention proxies: share of *recent* signups that have already
    // completed at least one booking in the same window. Real cohort
    // retention requires event tracking we don't have here yet.
    const d7Pct = retentionProxy(c, startOf7d);
    const d30Pct = retentionProxy(c, startOf30d);
    const d90Pct = retentionProxy(c, startOf90d);
    const [d7, d30, d90] = await Promise.all([d7Pct, d30Pct, d90Pct]);

    return {
      'monthly-active-customers': monthlyActivePatients,
      'weekly-transactions': weeklyBookings,
      'active-providers': activeProviders,
      'new-signups': newSignups30d,
      'onboarding-completion': `${onboardingRatePct}%`,
      'd7-retention': `${d7}%`,
      'd30-retention': `${d30}%`,
      'd90-retention': `${d90}%`,
      // KPIs without an obvious fcube source are intentionally omitted —
      // the route falls back to the static `target` definition only.
      // Surfacing raw 30 / 90-day booking totals is useful for debugging:
      'bookings-30d': bookings30d,
      'bookings-90d': bookings90d,
    };
  }

  private async computeProfileFromFcube(): Promise<Record<string, unknown>> {
    const c = await this.client();
    const [users, patients, providers, activeProviders, bookings, pharmacyOrders] =
      await Promise.all([
        c.user.count(),
        c.patientProfile.count(),
        c.providerProfile.count(),
        c.providerProfile.count({ where: { isActive: true } }),
        c.booking.count(),
        c.pharmacyOrder.count(),
      ]);
    return {
      totalUsers: users,
      totalPatients: patients,
      totalProviders: providers,
      activeProviders,
      totalBookings: bookings,
      totalPharmacyOrders: pharmacyOrders,
    };
  }

  // ─── Internal: Prisma client lifecycle ───────────────────────────────────

  private async client(): Promise<FcubeClient> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        if (this.opts.client) return this.opts.client;
        // Dynamic import — kept out of the bundle graph until the
        // adapter is selected. Loading fails cleanly via the factory's
        // `loadOptional` wrapper if `@curex24/database`'s client hasn't
        // been generated.
        const mod = (await import(
          /* webpackIgnore: true */
          '@curex24/database'
        )) as { PrismaClient: new (cfg?: unknown) => FcubeClient };
        return new mod.PrismaClient(
          this.opts.datasourceUrl
            ? { datasourceUrl: this.opts.datasourceUrl }
            : undefined,
        );
      })();
    }
    return this.clientPromise;
  }
}

// ─── Mapping helpers ────────────────────────────────────────────────────────

function projectResource<T>(
  tenantId: string,
  type: string,
  id: string,
  raw: Record<string, unknown>,
): Resource<T> {
  const data = projectFcubeRow(type, raw);
  const createdAt = toIso(raw.createdAt);
  const updatedAt = toIso(raw.updatedAt);
  return {
    id,
    tenantId,
    type,
    data: data as T,
    createdAt,
    updatedAt,
  };
}

function projectFcubeRow(type: string, raw: Record<string, unknown>): Record<string, unknown> {
  switch (type) {
    case 'users': {
      return {
        phone: raw.phone,
        email: raw.email ?? null,
        role: raw.role,
        isActive: raw.isActive,
        createdAt: toIso(raw.createdAt),
      };
    }
    case 'patients': {
      const user = raw.user as Record<string, unknown> | undefined;
      return {
        name: raw.name,
        phone: user?.phone ?? null,
        email: user?.email ?? null,
        verificationStatus: raw.verificationStatus,
        trustScore: raw.trustScore,
        totalBookings: raw.totalBookings,
        flaggedBookings: raw.flaggedBookings,
        isFlagged: raw.isFlagged,
        createdAt: toIso(raw.createdAt),
      };
    }
    case 'providers': {
      const user = raw.user as Record<string, unknown> | undefined;
      return {
        name: raw.name,
        specialization: raw.specialization,
        phone: user?.phone ?? null,
        email: user?.email ?? null,
        isVerified: raw.isVerified,
        isActive: raw.isActive,
        isAvailable: raw.isAvailable,
        homeVisitEnabled: raw.homeVisitEnabled,
        videoConsultationEnabled: raw.videoConsultationEnabled,
        consultationFeeHomeVisit: raw.consultationFeeHomeVisit,
        consultationFeeVideoConsultation: raw.consultationFeeVideoConsultation,
        createdAt: toIso(raw.createdAt),
      };
    }
    case 'bookings': {
      return {
        patientId: raw.patientId,
        providerId: raw.providerId,
        serviceCategoryId: raw.serviceCategoryId,
        mode: raw.mode,
        status: raw.status,
        paymentStatus: raw.paymentStatus,
        totalFee: raw.totalFee,
        scheduledAt: toIso(raw.scheduledAt),
        createdAt: toIso(raw.createdAt),
      };
    }
    case 'pharmacy-orders': {
      return {
        orderNumber: raw.orderNumber,
        patientProfileId: raw.patientProfileId,
        status: raw.status,
        paymentStatus: raw.paymentStatus,
        totalAmount: raw.totalAmount,
        deliveredAt: toIso(raw.deliveredAt),
        createdAt: toIso(raw.createdAt),
      };
    }
    default:
      return raw;
  }
}

async function fetchOneFromFcube(
  c: FcubeClient,
  type: string,
  id: string,
): Promise<Record<string, unknown> | null> {
  switch (type) {
    case 'users':
      return c.user.findUnique({ where: { id } });
    case 'patients':
      return c.patientProfile.findUnique({
        where: { id },
        include: { user: true },
      });
    case 'providers':
      return c.providerProfile.findUnique({
        where: { id },
        include: { user: true },
      });
    case 'bookings':
      return c.booking.findUnique({ where: { id } });
    case 'pharmacy-orders':
      return c.pharmacyOrder.findUnique({ where: { id } });
    default:
      return null;
  }
}

async function fetchManyFromFcube(
  c: FcubeClient,
  type: string,
  opts: ListOptions,
): Promise<Record<string, unknown>[]> {
  // We cap reads so a misconfigured `limit` can't pull millions of rows
  // into Node memory. UIs that need pagination can pass `cursor`.
  const take = clampLimit(opts.limit);
  const orderBy = parseOrderBy(opts.orderBy) ?? { createdAt: 'desc' as const };
  switch (type) {
    case 'users':
      return c.user.findMany({ take, orderBy });
    case 'patients':
      return c.patientProfile.findMany({ take, orderBy, include: { user: true } });
    case 'providers':
      return c.providerProfile.findMany({ take, orderBy, include: { user: true } });
    case 'bookings':
      return c.booking.findMany({ take, orderBy });
    case 'pharmacy-orders':
      return c.pharmacyOrder.findMany({ take, orderBy });
    default:
      return [];
  }
}

async function retentionProxy(c: FcubeClient, since: Date): Promise<number> {
  const [signups, retained] = await Promise.all([
    c.patientProfile.count({ where: { createdAt: { gte: since } } }),
    c.patientProfile.count({
      where: { createdAt: { gte: since }, totalBookings: { gt: 0 } },
    }),
  ]);
  if (signups === 0) return 0;
  return Math.round((retained / signups) * 100);
}

function clampLimit(limit: number | undefined): number {
  if (!limit || limit <= 0) return 100;
  return Math.min(limit, 500);
}

function parseOrderBy(orderBy: string | undefined): Record<string, 'asc' | 'desc'> | undefined {
  if (!orderBy) return undefined;
  const [field, dirRaw] = orderBy.split(':');
  if (!field) return undefined;
  const dir = dirRaw === 'asc' ? 'asc' : 'desc';
  return { [field]: dir };
}

const LIVE_PROFILE_FIELDS = new Set([
  'totalUsers',
  'totalPatients',
  'totalProviders',
  'activeProviders',
  'totalBookings',
  'totalPharmacyOrders',
]);

function stripLiveProfileFields(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (!LIVE_PROFILE_FIELDS.has(k)) out[k] = v;
  }
  return out;
}

function toIso(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return v;
  return undefined;
}

function safeMaskUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    if (u.username) u.username = u.username.slice(0, 1) + '***';
    return u.toString();
  } catch {
    return '<invalid DATABASE_URL>';
  }
}

// ─── Internal: typed Prisma client surface ─────────────────────────────────
//
// We type `FcubeClient` against just the shape we use, so this file
// doesn't have to import generated Prisma types (which may not exist
// before `db:generate` runs in environments that don't use this
// adapter).

interface PrismaDelegate {
  count(args?: unknown): Promise<number>;
  findUnique(args: unknown): Promise<Record<string, unknown> | null>;
  findMany(args?: unknown): Promise<Record<string, unknown>[]>;
}

export interface FcubeClient {
  user: PrismaDelegate;
  patientProfile: PrismaDelegate;
  providerProfile: PrismaDelegate;
  booking: PrismaDelegate;
  pharmacyOrder: PrismaDelegate;
  $disconnect?: () => Promise<void>;
}

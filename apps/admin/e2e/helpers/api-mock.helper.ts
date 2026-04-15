import type { Page, Route } from '@playwright/test';
import users from '../test-data/users.json';
import bookings from '../test-data/bookings.json';
import providers from '../test-data/providers.json';

function json(route: Route, body: unknown, status = 200): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

export async function mockAdminLogin(page: Page, credentials?: { email?: string; password?: string }) {
  const validEmail = credentials?.email || users.admin.valid.email;
  const validPassword = credentials?.password || users.admin.valid.password;

  await page.route('**/auth/admin-login', async (route) => {
    const data = route.request().postDataJSON() as { email?: string; password?: string };
    if (data?.email === validEmail && data?.password === validPassword) {
      return json(route, {
        token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJBRE1JTiJ9.c2lnbmF0dXJl',
        user: { email: validEmail, role: 'ADMIN' },
      });
    }
    return json(route, { message: 'Invalid credentials.' }, 401);
  });
}

export async function mockCommonAdminApis(page: Page) {
  await page.route('**/admin/dashboard', (route) =>
    json(route, {
      totalBookings: 24,
      activeProviders: 8,
      pendingVerification: 2,
      totalPatients: 18,
      completedBookings: 16,
      cancelledBookings: 3,
      totalEarnings: 62500,
      bookingsByStatus: {
        COMPLETED: 16,
        REQUESTED: 3,
        CANCELLED: 3,
        IN_PROGRESS: 2,
      },
    }),
  );

  await page.route('**/admin/dashboard/charts', (route) =>
    json(route, {
      bookingsPerDay: { '2026-04-01': 2, '2026-04-02': 4, '2026-04-03': 3 },
      earningsPerDay: { '2026-04-01': 5000, '2026-04-02': 9000, '2026-04-03': 7000 },
    }),
  );

  await page.route('**/admin/bookings**', (route) =>
    json(route, {
      data: bookings.items,
      total: bookings.items.length,
      page: 1,
      totalPages: 1,
    }),
  );

  await page.route('**/admin/providers/pending', (route) => json(route, providers.pending));
  await page.route('**/admin/providers**', (route) => json(route, providers.all));

  await page.route('**/admin/diagnostics**', (route) =>
    json(route, {
      data: [
        {
          id: 'diag-1',
          testType: 'CBC',
          notes: 'Fasting required',
          status: 'REQUESTED',
          scheduledAt: null,
          createdAt: '2026-04-10T10:00:00.000Z',
          booking: {
            id: 'booking-1',
            patient: { name: 'Ravi Kumar' },
            provider: { name: 'Dr. Priya Sharma' },
          },
          labResults: [],
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    }),
  );

  await page.route('**/admin/payouts/summary', (route) =>
    json(route, {
      totalPayouts: 1,
      pendingCount: 1,
      processedCount: 0,
      totalAmount: 3200,
      pendingAmount: 3200,
      processedAmount: 0,
    }),
  );

  await page.route('**/admin/payouts**', (route) =>
    json(route, {
      data: [
        {
          id: 'payout-1',
          providerId: 'provider-1',
          bookingId: 'booking-1',
          amount: 3200,
          status: 'PENDING',
          processedAt: null,
          createdAt: '2026-04-10T10:00:00.000Z',
          provider: { name: 'Dr. Priya Sharma' },
          booking: {
            totalFee: 4000,
            patient: { name: 'Ravi Kumar' },
            serviceCategory: { name: 'General Physician' },
            payment: { status: 'PAID' },
          },
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    }),
  );

  await page.route('**/admin/referrals', (route) =>
    json(route, [
      {
        id: 'ref-1',
        specialistType: 'Cardiologist',
        notes: 'Needs specialist follow-up',
        status: 'RECOMMENDED',
        createdAt: '2026-04-10T10:00:00.000Z',
        updatedAt: '2026-04-10T10:00:00.000Z',
        booking: {
          id: 'booking-1',
          patient: { name: 'Ravi Kumar' },
          provider: { name: 'Dr. Priya Sharma' },
        },
      },
    ]),
  );

  await page.route('**/admin/providers/*/verify', (route) => json(route, { success: true }));
  await page.route('**/admin/providers/*/reject', (route) => json(route, { success: true }));
  await page.route('**/admin/providers/*/deactivate', (route) => json(route, { success: true }));
  await page.route('**/admin/payouts/*/process', (route) => json(route, { success: true }));
  await page.route('**/diagnostics/*/result', (route) => json(route, { success: true }));
  await page.route('**/diagnostics/*', (route) => json(route, { success: true }));
  await page.route('**/referrals/*', (route) => json(route, { success: true }));
}

export async function mockApiError(page: Page, urlPattern: string, message: string, status = 500) {
  await page.route(urlPattern, (route) => json(route, { message }, status));
}

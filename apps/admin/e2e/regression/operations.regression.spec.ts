import { test, expect } from '../fixtures/auth.fixture';
import { DiagnosticsPage } from '../pages/DiagnosticsPage';
import { PayoutsPage } from '../pages/PayoutsPage';
import { ReferralsPage } from '../pages/ReferralsPage';

test.describe('Operations Regression', () => {
  test('@regression should update diagnostics status', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/v1/admin/diagnostics**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'diag-1',
              testType: 'CBC',
              notes: 'Follow-up required',
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
      }),
    );

    const diagnosticsPage = new DiagnosticsPage(authenticatedPage);
    await diagnosticsPage.goto();
    await diagnosticsPage.assertLoaded();
    await diagnosticsPage.clickStatusFilter('REQUESTED');
    await diagnosticsPage.scheduleFirstRequest();
    await diagnosticsPage.assertLoaded();
  });

  test('@regression should process payout and update referral statuses', async ({ authenticatedPage }) => {
    let payoutProcessCalls = 0;
    let referralUpdateCalls = 0;

    await authenticatedPage.route('**/api/v1/admin/referrals**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'ref-1',
            specialistType: 'Cardiologist',
            notes: 'urgent',
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
      }),
    );

    await authenticatedPage.route('**/api/v1/admin/payouts/*/process', async (route) => {
      payoutProcessCalls += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await authenticatedPage.route('**/api/v1/referrals/*', async (route) => {
      referralUpdateCalls += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    const payoutsPage = new PayoutsPage(authenticatedPage);
    await payoutsPage.goto();
    await payoutsPage.markFirstPendingProcessed();

    const referralsPage = new ReferralsPage(authenticatedPage);
    await referralsPage.goto();
    await referralsPage.markFirstRecommendedBooked();

    await expect.poll(() => payoutProcessCalls).toBe(1);
    await expect.poll(() => referralUpdateCalls).toBe(1);
  });
});

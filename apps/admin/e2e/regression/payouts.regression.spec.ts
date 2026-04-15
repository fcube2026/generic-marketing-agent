import { test, expect } from '../fixtures/auth.fixture';
import { PayoutsPage } from '../pages/PayoutsPage';

test.describe('Payouts Regression', () => {
  test('@regression should filter payouts by status', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/v1/admin/payouts/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalPayouts: 2,
          pendingCount: 1,
          processedCount: 1,
          totalAmount: 7000,
          pendingAmount: 3200,
          processedAmount: 3800,
        }),
      });
    });

    await authenticatedPage.route('**/api/v1/admin/payouts?*', async (route) => {
      const url = new URL(route.request().url());
      const status = url.searchParams.get('status');
      const data = status === 'PROCESSED'
        ? [
            {
              id: 'payout-processed',
              providerId: 'provider-2',
              bookingId: 'booking-2',
              amount: 3800,
              status: 'PROCESSED',
              processedAt: '2026-04-11T10:00:00.000Z',
              createdAt: '2026-04-10T10:00:00.000Z',
              provider: { name: 'Dr. Processed' },
              booking: {
                totalFee: 4500,
                patient: { name: 'Processed Patient' },
                serviceCategory: { name: 'Cardiology' },
                payment: { status: 'PAID' },
              },
            },
          ]
        : [
            {
              id: 'payout-pending',
              providerId: 'provider-1',
              bookingId: 'booking-1',
              amount: 3200,
              status: 'PENDING',
              processedAt: null,
              createdAt: '2026-04-10T10:00:00.000Z',
              provider: { name: 'Dr. Pending' },
              booking: {
                totalFee: 4000,
                patient: { name: 'Pending Patient' },
                serviceCategory: { name: 'General Medicine' },
                payment: { status: 'PAID' },
              },
            },
          ];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data, total: data.length, page: 1, totalPages: 1 }),
      });
    });

    const payoutsPage = new PayoutsPage(authenticatedPage);
    await payoutsPage.goto();
    await payoutsPage.assertLoaded();
    await expect(authenticatedPage.getByRole('cell', { name: 'Dr. Pending' })).toBeVisible();

    await payoutsPage.filterByStatus('PROCESSED');
    await expect(authenticatedPage.getByRole('cell', { name: 'Dr. Processed' })).toBeVisible();
  });

  test('@regression should process a pending payout', async ({ authenticatedPage }) => {
    let processCalls = 0;

    await authenticatedPage.route('**/api/v1/admin/payouts/*/process', async (route) => {
      processCalls += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    const payoutsPage = new PayoutsPage(authenticatedPage);
    await payoutsPage.goto();
    await payoutsPage.assertLoaded();
    await payoutsPage.markFirstPendingProcessed();

    await expect.poll(() => processCalls).toBe(1);
  });
});
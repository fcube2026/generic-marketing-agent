import { test, expect } from '../fixtures/auth.fixture';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Dashboard Regression', () => {
  test('@regression should render dashboard metrics and refresh data', async ({ authenticatedPage }) => {
    let dashboardCalls = 0;
    let chartCalls = 0;

    await authenticatedPage.route('**/admin/dashboard', async (route) => {
      dashboardCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalBookings: 42,
          activeProviders: 11,
          pendingVerification: 3,
          totalPatients: 27,
          completedBookings: 30,
          cancelledBookings: 2,
          totalEarnings: 125000,
          bookingsByStatus: {
            COMPLETED: 30,
            REQUESTED: 8,
            CANCELLED: 2,
            IN_PROGRESS: 2,
          },
        }),
      });
    });

    await authenticatedPage.route('**/admin/dashboard/charts', async (route) => {
      chartCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bookingsPerDay: { '2026-04-10': 4, '2026-04-11': 6, '2026-04-12': 5 },
          earningsPerDay: { '2026-04-10': 12000, '2026-04-11': 18000, '2026-04-12': 15000 },
        }),
      });
    });

    const dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.goto();
    await dashboardPage.assertLoaded();

    await expect(authenticatedPage.getByText('42')).toBeVisible();
    await expect(authenticatedPage.getByText('₹1,25,000')).toBeVisible();

    await dashboardPage.clickRefresh();

    await expect.poll(() => dashboardCalls).toBeGreaterThan(1);
    await expect.poll(() => chartCalls).toBeGreaterThan(1);
  });

  test('@regression should fall back to zero state when dashboard APIs fail', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/admin/dashboard', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'dashboard failed' }),
      });
    });

    await authenticatedPage.route('**/admin/dashboard/charts', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'charts failed' }),
      });
    });

    const dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.goto();
    await dashboardPage.assertLoaded();

    await expect(authenticatedPage.getByText('Total Earnings')).toBeVisible();
    await expect(authenticatedPage.getByText('₹0')).toBeVisible();
  });
});
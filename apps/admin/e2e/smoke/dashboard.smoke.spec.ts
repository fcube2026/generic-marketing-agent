import { test } from '../fixtures/auth.fixture';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Dashboard Smoke', () => {
  test('@smoke should load dashboard with key widgets', async ({ authenticatedPage }) => {
    const dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.goto();
    await dashboardPage.assertLoaded();
    await dashboardPage.clickRefresh();
  });
});

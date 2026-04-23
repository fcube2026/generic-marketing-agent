import { test as base, expect } from '@playwright/test';
import { test, expect as authExpect } from '../fixtures/auth.fixture';
import { DashboardPage } from '../pages/DashboardPage';
import { ProvidersPage } from '../pages/ProvidersPage';

base.describe('Cross-Cutting Regression', () => {
  base.use({ storageState: { cookies: [], origins: [] } });

  base('@regression should redirect unauthenticated users from protected routes to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Cross-Cutting Regression (Authenticated)', () => {
  test('@regression should allow deep-link navigation to protected pages', async ({ authenticatedPage }) => {
    const providersPage = new ProvidersPage(authenticatedPage);
    await providersPage.goto();
    await providersPage.assertLoaded();
  });

  test('@regression should preserve layout on the current project viewport', async ({ authenticatedPage }) => {
    const dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.goto();
    await dashboardPage.assertLoaded();

    await authExpect(authenticatedPage.getByTestId('sidebar')).toBeVisible();
    await authExpect(authenticatedPage.getByTestId('header')).toBeVisible();
  });
});
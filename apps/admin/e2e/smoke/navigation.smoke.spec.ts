import { test, expect } from '../fixtures/auth.fixture';
import { SidebarComponent } from '../pages/components/SidebarComponent';
import { HeaderComponent } from '../pages/components/HeaderComponent';

test.describe('Navigation Smoke', () => {
  test('@smoke should navigate across core sections from sidebar', async ({ authenticatedPage }) => {
    const sidebar = new SidebarComponent(authenticatedPage);
    const header = new HeaderComponent(authenticatedPage);

    await authenticatedPage.goto('/dashboard');
    await sidebar.assertVisible();
    await header.assertVisible();

    await sidebar.navigateTo('Bookings');
    await expect(authenticatedPage).toHaveURL(/\/bookings/);

    await sidebar.navigateTo('Providers');
    await expect(authenticatedPage).toHaveURL(/\/providers/);

    await sidebar.navigateTo('Support');
    await expect(authenticatedPage).toHaveURL(/\/support/);
  });
});

import { expect, type Locator, type Page } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly refreshButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Dashboard' });
    this.refreshButton = page.getByRole('button', { name: /refresh/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard');
  }

  async clickRefresh(): Promise<void> {
    await this.refreshButton.click();
  }

  async openManageProviders(): Promise<void> {
    await this.page.getByRole('link', { name: /manage providers/i }).click();
  }

  async assertLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.page.getByText('Overview of your healthcare platform')).toBeVisible();
    await expect(this.page.getByText('Total Bookings')).toBeVisible();
    await expect(this.page.getByText('Total Patients')).toBeVisible();
  }
}

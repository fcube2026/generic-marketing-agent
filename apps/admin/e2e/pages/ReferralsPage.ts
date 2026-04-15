import { expect, type Locator, type Page } from '@playwright/test';

export class ReferralsPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Specialist Referrals' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/referrals');
  }

  async markFirstRecommendedBooked(): Promise<void> {
    await this.page.getByRole('button', { name: /mark booked/i }).first().click();
  }

  async markFirstBookedCompleted(): Promise<void> {
    await this.page.getByRole('button', { name: /mark completed/i }).first().click();
  }

  async assertLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.page.getByRole('columnheader', { name: 'Specialist Type' })).toBeVisible();
  }

  async assertEmptyState(): Promise<void> {
    await expect(this.page.getByText('No specialist referrals')).toBeVisible();
  }
}

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

  async markBookedForSpecialist(specialist: string): Promise<void> {
    const row = this.page.getByRole('row', { name: new RegExp(specialist, 'i') });
    await row.getByRole('button', { name: /mark booked/i }).click();
  }

  async markFirstBookedCompleted(): Promise<void> {
    await this.page.getByRole('button', { name: /mark completed/i }).first().click();
  }

  async assertLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    const tableHeader = this.page.getByRole('columnheader', { name: 'Specialist Type' });
    const emptyState = this.page.getByText('No specialist referrals');
    await expect
      .poll(async () => (await tableHeader.isVisible()) || (await emptyState.isVisible()))
      .toBeTruthy();
  }

  async assertEmptyState(): Promise<void> {
    await expect(this.page.getByText('No specialist referrals')).toBeVisible();
  }
}

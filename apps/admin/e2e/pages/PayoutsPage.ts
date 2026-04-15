import { expect, type Locator, type Page } from '@playwright/test';

export class PayoutsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly statusSelect: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Payouts' });
    this.statusSelect = page.locator('select').first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/payouts');
  }

  async filterByStatus(status: string): Promise<void> {
    await this.statusSelect.selectOption(status);
  }

  async markFirstPendingProcessed(): Promise<void> {
    await this.page.getByRole('button', { name: /mark processed/i }).first().click();
  }

  async assertLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.page.getByText('Total Payouts')).toBeVisible();
    await expect(this.page.getByRole('columnheader', { name: 'Provider' })).toBeVisible();
  }

  async assertEmptyState(): Promise<void> {
    await expect(this.page.getByText('No payouts found')).toBeVisible();
  }
}

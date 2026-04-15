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

  async markProcessedForProvider(name: string): Promise<void> {
    const row = this.page.getByRole('row', { name: new RegExp(name, 'i') });
    await row.getByRole('button', { name: /mark processed/i }).click();
  }

  async assertLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    const totalPayouts = this.page.getByText('Total Payouts');
    const providerHeader = this.page.getByRole('columnheader', { name: 'Provider', exact: true });
    const emptyState = this.page.getByText('No payouts found');
    await expect
      .poll(
        async () =>
          (await totalPayouts.isVisible()) ||
          (await providerHeader.isVisible()) ||
          (await emptyState.isVisible()),
      )
      .toBeTruthy();
  }

  async assertEmptyState(): Promise<void> {
    await expect(this.page.getByText('No payouts found')).toBeVisible();
  }
}

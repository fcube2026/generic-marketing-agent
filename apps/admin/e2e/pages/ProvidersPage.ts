import { expect, type Locator, type Page } from '@playwright/test';

export class ProvidersPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly refreshButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Providers' });
    this.refreshButton = page.getByRole('button', { name: /refresh/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/providers');
  }

  async openTab(name: 'Pending' | 'Active' | 'Rejected' | 'All'): Promise<void> {
    await this.page.getByRole('button', { name: new RegExp(name, 'i') }).click();
  }

  async approveFirstPending(): Promise<void> {
    await this.page.getByRole('button', { name: /approve/i }).first().click();
  }

  async openRejectModalForProvider(name: string): Promise<void> {
    const row = this.page.getByRole('row', { name: new RegExp(name, 'i') });
    await row.getByRole('button', { name: /reject/i }).click();
  }

  async rejectWithReason(reason: string): Promise<void> {
    await this.page.getByPlaceholder(/reason for rejection/i).fill(reason);
    await this.page.getByRole('button', { name: /reject provider/i }).click();
  }

  async assertLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
  }

  async assertEmptyState(): Promise<void> {
    await expect(this.page.getByText('No providers found')).toBeVisible();
  }
}

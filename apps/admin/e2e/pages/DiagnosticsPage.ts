import { expect, type Locator, type Page } from '@playwright/test';

export class DiagnosticsPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Diagnostics Coordination' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/diagnostics');
  }

  async clickStatusFilter(status: 'All' | 'REQUESTED' | 'SCHEDULED' | 'COLLECTED' | 'RESULTED'): Promise<void> {
    await this.page.getByRole('button', { name: new RegExp(status, 'i') }).click();
  }

  async scheduleFirstRequest(): Promise<void> {
    await this.page.getByRole('button', { name: /schedule/i }).first().click();
  }

  async uploadResult(url: string, notes: string): Promise<void> {
    await this.page.getByRole('button', { name: /upload result/i }).first().click();
    await this.page.getByLabel('Result File URL').fill(url);
    await this.page.getByLabel('Notes').fill(notes);
    await this.page.getByRole('button', { name: /^upload result$/i }).click();
  }

  async assertLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.page.getByRole('columnheader', { name: 'Test Type' })).toBeVisible();
  }

  async assertEmptyState(): Promise<void> {
    await expect(this.page.getByText('No diagnostic requests found')).toBeVisible();
  }
}

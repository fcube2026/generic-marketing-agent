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
    await this.page.getByRole('table').getByRole('button', { name: /^schedule$/i }).first().click();
  }

  async scheduleRequestForTestType(testType: string): Promise<void> {
    const row = this.page.getByRole('row', { name: new RegExp(testType, 'i') });
    await row.getByRole('button', { name: /^schedule$/i }).click();
  }

  async uploadResultForTestType(testType: string, url: string, notes: string): Promise<void> {
    const row = this.page.getByRole('row', { name: new RegExp(testType, 'i') });
    await row.getByRole('button', { name: /upload result/i }).click();
    await this.page.getByLabel('Result File URL').fill(url);
    await this.page.getByLabel('Notes').fill(notes);
    await this.page.locator('div.fixed').getByRole('button', { name: /^upload result$/i }).click();
  }

  async uploadResult(url: string, notes: string): Promise<void> {
    await this.page.getByRole('button', { name: /upload result/i }).first().click();
    await this.page.getByLabel('Result File URL').fill(url);
    await this.page.getByLabel('Notes').fill(notes);
    await this.page.locator('div.fixed').getByRole('button', { name: /^upload result$/i }).click();
  }

  async assertLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    const tableHeader = this.page.getByRole('columnheader', { name: 'Test Type' });
    const emptyState = this.page.getByText('No diagnostic requests found');
    await expect
      .poll(async () => (await tableHeader.isVisible()) || (await emptyState.isVisible()))
      .toBeTruthy();
  }

  async assertEmptyState(): Promise<void> {
    await expect(this.page.getByText('No diagnostic requests found')).toBeVisible();
  }
}

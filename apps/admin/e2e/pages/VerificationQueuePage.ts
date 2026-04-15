import { expect, type Locator, type Page } from '@playwright/test';

export class VerificationQueuePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly refreshButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Verification Queue' });
    this.refreshButton = page.getByRole('button', { name: /refresh/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/verification-queue');
  }

  async clickRefresh(): Promise<void> {
    await this.refreshButton.click();
  }

  async approveFirstProvider(): Promise<void> {
    await this.page.getByRole('button', { name: /approve/i }).first().click();
    await this.page.getByRole('button', { name: /approve provider/i }).click();
  }

  async assertLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.page.getByText(/awaiting review|queue is empty/i)).toBeVisible();
  }

  async assertQueueEmpty(): Promise<void> {
    await expect(this.page.getByText('Queue is empty')).toBeVisible();
  }
}

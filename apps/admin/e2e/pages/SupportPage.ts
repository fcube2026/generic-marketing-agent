import { expect, type Locator, type Page } from '@playwright/test';

export class SupportPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Support' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/support');
  }

  async assertLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Support Dashboard' })).toBeVisible();
    await expect(this.page.getByText('support@curex24.com')).toBeVisible();
  }
}

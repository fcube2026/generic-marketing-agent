import { expect, type Locator, type Page } from '@playwright/test';

export class HeaderComponent {
  readonly page: Page;
  readonly container: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId('header');
    this.logoutButton = page.getByTestId('logout-button');
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }

  async assertVisible(): Promise<void> {
    await expect(this.container).toBeVisible();
    await expect(this.page.getByText('admin@curex24.com')).toBeVisible();
  }
}

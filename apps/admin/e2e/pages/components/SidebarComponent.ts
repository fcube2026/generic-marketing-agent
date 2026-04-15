import { expect, type Locator, type Page } from '@playwright/test';

export class SidebarComponent {
  readonly page: Page;
  readonly container: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId('sidebar');
  }

  link(label: string): Locator {
    return this.container.getByRole('link', { name: new RegExp(label, 'i') });
  }

  async navigateTo(label: string): Promise<void> {
    await this.link(label).click();
  }

  async assertVisible(): Promise<void> {
    await expect(this.container).toBeVisible();
    await expect(this.page.getByTestId('sidebar-nav')).toBeVisible();
  }
}

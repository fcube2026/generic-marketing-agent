import { expect, type Locator, type Page } from '@playwright/test';

export class BookingsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly refreshButton: Locator;
  readonly statusSelect: Locator;
  readonly previousButton: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Bookings' });
    this.refreshButton = page.getByRole('button', { name: /refresh/i });
    this.statusSelect = page.locator('select').first();
    this.previousButton = page.getByRole('button', { name: /previous/i });
    this.nextButton = page.getByRole('button', { name: /next/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/bookings');
  }

  async filterByStatus(status: string): Promise<void> {
    await this.statusSelect.selectOption(status);
  }

  async goToNextPage(): Promise<void> {
    await this.nextButton.click();
  }

  async clickRefresh(): Promise<void> {
    await this.refreshButton.click();
  }

  async assertLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.page.getByRole('columnheader', { name: 'Patient' })).toBeVisible();
    await expect(this.page.getByText('Filter by status:')).toBeVisible();
  }

  async assertTableVisible(): Promise<void> {
    await expect(this.page.getByRole('table')).toBeVisible();
  }

  async assertEmptyState(): Promise<void> {
    await expect(this.page.getByText('No bookings found')).toBeVisible();
  }

  async assertPaginationVisible(): Promise<void> {
    await expect(this.page.getByText(/page \d+ of \d+/i)).toBeVisible();
  }

  async assertPatientVisible(name: string): Promise<void> {
    await expect(this.page.getByRole('cell', { name })).toBeVisible();
  }
}

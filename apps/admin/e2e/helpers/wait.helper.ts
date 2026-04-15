import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function waitForUrlPath(page: Page, path: string): Promise<void> {
  await page.waitForURL(`**${path}`, { timeout: 15_000 });
}

export async function waitForHidden(locator: Locator): Promise<void> {
  await expect(locator).toBeHidden({ timeout: 15_000 });
}

export async function waitForVisible(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible({ timeout: 15_000 });
}

import { test as base, expect, type Page } from '@playwright/test';
import { AUTH_STATE_PATH } from '../helpers/auth.helper';
import { mockCommonAdminApis } from '../helpers/api-mock.helper';

interface AuthFixtures {
  authenticatedPage: Page;
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext({
      baseURL,
      storageState: AUTH_STATE_PATH,
    });
    const page = await context.newPage();
    await mockCommonAdminApis(page);
    await use(page);
    await context.close();
  },
});

export { expect };

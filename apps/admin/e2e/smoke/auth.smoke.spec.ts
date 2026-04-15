import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { mockAdminLogin, mockCommonAdminApis } from '../helpers/api-mock.helper';
import users from '../test-data/users.json';

test.describe('Admin Auth Smoke', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('@smoke should login successfully and land on dashboard', async ({ page }) => {
    await mockAdminLogin(page, users.admin.valid);
    await mockCommonAdminApis(page);

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.assertLoaded();
    await loginPage.login(users.admin.valid.email, users.admin.valid.password);

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});

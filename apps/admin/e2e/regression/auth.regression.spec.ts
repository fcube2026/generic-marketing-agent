import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { HeaderComponent } from '../pages/components/HeaderComponent';
import { mockAdminLogin, mockCommonAdminApis } from '../helpers/api-mock.helper';
import users from '../test-data/users.json';

test.describe('Auth Regression', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('@regression should show error for invalid login credentials', async ({ page }) => {
    await mockAdminLogin(page, users.admin.valid);

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(users.admin.invalid.email, users.admin.invalid.password);
    await loginPage.assertErrorVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('@regression should logout and return to login page', async ({ page }) => {
    await mockAdminLogin(page, users.admin.valid);
    await mockCommonAdminApis(page);

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(users.admin.valid.email, users.admin.valid.password);

    await new HeaderComponent(page).logout();
    await expect(page).toHaveURL(/\/login/);
  });
});

import fs from 'fs/promises';
import path from 'path';
import type { FullConfig } from '@playwright/test';
import { chromium, expect } from '@playwright/test';
import { AUTH_STATE_PATH, getAdminTestCredentials, mockAdminLoginPayload } from './helpers/auth.helper';

async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL as string;
  const { email, password } = getAdminTestCredentials();

  await fs.mkdir(path.dirname(AUTH_STATE_PATH), { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  await page.route('**/auth/admin-login', async (route) => {
    const data = route.request().postDataJSON() as { email?: string; password?: string };
    if (data?.email === email && data?.password === password) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAdminLoginPayload(email)),
      });
    }

    return route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Invalid credentials.' }),
    });
  });

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await context.storageState({ path: AUTH_STATE_PATH });

  await context.close();
  await browser.close();
}

export default globalSetup;

/// <reference types="node" />

import fs from 'fs/promises';
import path from 'path';
import type { FullConfig, Route } from '@playwright/test';
import { chromium, expect } from '@playwright/test';
import { AUTH_STATE_PATH, getAdminTestCredentials, mockAdminLoginPayload } from './helpers/auth.helper';
import { mockCommonAdminApis } from './helpers/api-mock.helper';

async function globalSetup(config: FullConfig): Promise<void> {
  const projectWithBaseUrl = config.projects.find((project: FullConfig['projects'][number]) => project.use?.baseURL);
  const baseURL = (projectWithBaseUrl?.use?.baseURL as string | undefined) ?? 'http://localhost:3001';
  const { email, password } = getAdminTestCredentials();

  await fs.mkdir(path.dirname(AUTH_STATE_PATH), { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  const loginRouteHandler = async (route: Route) => {
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
  };
  await page.route('**/auth/admin-login', loginRouteHandler);
  await page.route('**/api/v1/auth/admin-login', loginRouteHandler);
  // Mock dashboard API calls so the 401-redirect loop doesn't fire
  // when global-setup navigates to /dashboard after mock login.
  await mockCommonAdminApis(page);

  await page.goto('/login');
  // Wait up to 15s for the login form — if the page is behind Vercel protection
  // or otherwise unavailable, fail immediately with a clear message.
  const formVisible = await page.locator('[data-testid="login-form"]').waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false);
  if (!formVisible) {
    const pageTitle = await page.title();
    const url = page.url();
    throw new Error(`Login form not found at ${url} (page title: "${pageTitle}"). The site may be behind Vercel Deployment Protection or not yet deployed.`);
  }
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForTimeout(300);
  const loginError = page.getByText(/invalid credentials|unable to reach|login failed/i).first();
  if (await loginError.isVisible()) {
    throw new Error(`Global setup login failed: ${await loginError.textContent()}`);
  }

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  await context.storageState({ path: AUTH_STATE_PATH });

  await context.close();
  await browser.close();
}

export default globalSetup;

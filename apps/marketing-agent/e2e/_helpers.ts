import { expect, Locator, Page } from "@playwright/test";

function firstVisible(...locators: Locator[]) {
  // We will just return the first locator; assertions will ensure it exists/visible.
  return locators[0];
}

export async function gotoLogin(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });

  // Wait for some stable login-page signal (either URL or a submit button)
  await expect(page).toHaveURL(/\/login/i);

  // Ensure the form is rendered (button text may differ; keep flexible)
  await expect(
    page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first()
  ).toBeVisible({ timeout: 20_000 });
}

export function emailInput(page: Page) {
  // Try common patterns in order
  return firstVisible(
    page.locator('input[type="email"]').first(),
    page.locator('input[name="email"]').first(),
    page.locator('input#email').first(),
    page.getByPlaceholder(/email/i).first(),
    page.locator('input[autocomplete="email"]').first()
  );
}

export function passwordInput(page: Page) {
  return firstVisible(
    page.locator('input[type="password"]').first(),
    page.locator('input[name="password"]').first(),
    page.locator('input#password').first(),
    page.getByPlaceholder(/password/i).first(),
    page.locator('input[autocomplete="current-password"]').first()
  );
}

export async function fillLogin(page: Page, email: string, password: string) {
  const emailEl = page.locator(
    'input[type="email"], input[name="email"], input#email, input[autocomplete="email"]'
  ).first();

  const passwordEl = page.locator(
    'input[type="password"], input[name="password"], input#password, input[autocomplete="current-password"]'
  ).first();

  // If those don’t exist, fall back to placeholders
  const fallbackEmail = page.getByPlaceholder(/email/i).first();
  const fallbackPassword = page.getByPlaceholder(/password/i).first();

  const chosenEmail = (await emailEl.count()) ? emailEl : fallbackEmail;
  const chosenPassword = (await passwordEl.count()) ? passwordEl : fallbackPassword;

  await expect(chosenEmail).toBeVisible({ timeout: 20_000 });
  await chosenEmail.fill(email);

  await expect(chosenPassword).toBeVisible({ timeout: 20_000 });
  await chosenPassword.fill(password);

  // Click submit: prefer type=submit, fallback to button text
  const submit = page.locator('button[type="submit"]').first();
  if (await submit.count()) {
    await submit.click();
  } else {
    await page.getByRole("button", { name: /sign in|login|log in/i }).click();
  }
}
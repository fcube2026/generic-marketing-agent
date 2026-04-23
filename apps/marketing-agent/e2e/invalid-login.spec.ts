import { test, expect } from "@playwright/test";
import { gotoLogin, fillLogin } from "./_helpers";

test("shows error on invalid credentials", async ({ page }) => {
  await gotoLogin(page);

  await fillLogin(page, "admin@curex24.com", "wrong-password-123");

  // Expect still on login (or not on dashboard)
  await expect(page).toHaveURL(/\/login/i, { timeout: 20_000 });

  // Accept common error messages/toasts
  await expect(
    page.locator(
      'text=/invalid|incorrect|unauthorized|login failed|wrong password/i'
    ).first()
  ).toBeVisible({ timeout: 20_000 });
});
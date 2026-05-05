import { test, expect } from "@playwright/test";
import { gotoLogin, fillLogin } from "./_helpers";

test("marketing agent admin can log in", async ({ page }) => {
  await gotoLogin(page);

  await fillLogin(page, "admin@example.com", "admin123");

  // Some apps redirect to "/" or "/dashboard"
  await expect(page).toHaveURL(/\/(dashboard)?$/i, { timeout: 30_000 });

  // Assert something dashboard-ish exists (heading OR sidebar)
  await expect(
    page.locator("text=Marketing Dashboard, text=Dashboard").first()
  ).toBeVisible({ timeout: 30_000 });
});
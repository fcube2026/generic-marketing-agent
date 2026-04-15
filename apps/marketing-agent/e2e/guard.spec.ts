import { test, expect } from "@playwright/test";

test("redirects unauthenticated user from /dashboard to /login", async ({ page }) => {
  // Ensure clean unauthenticated state (JWT-in-localStorage style)
  await page.addInitScript(() => {
    try {
      localStorage.removeItem("token");
    } catch {}
  });

  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

  // App should redirect to login (allow optional query params)
  await expect(page).toHaveURL(/\/login(\?.*)?$/i, { timeout: 20_000 });

  // Basic assertion login UI exists
  await expect(
    page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first()
  ).toBeVisible({ timeout: 20_000 });
});
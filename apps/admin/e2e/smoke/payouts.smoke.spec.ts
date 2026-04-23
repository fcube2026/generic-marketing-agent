import { test } from '../fixtures/auth.fixture';
import { PayoutsPage } from '../pages/PayoutsPage';

test.describe('Payouts Smoke', () => {
  test('@smoke should load payouts page with summary and list', async ({ authenticatedPage }) => {
    const payoutsPage = new PayoutsPage(authenticatedPage);
    await payoutsPage.goto();
    await payoutsPage.assertLoaded();
  });
});

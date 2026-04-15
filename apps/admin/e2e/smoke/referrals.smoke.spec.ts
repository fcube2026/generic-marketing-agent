import { test } from '../fixtures/auth.fixture';
import { ReferralsPage } from '../pages/ReferralsPage';

test.describe('Referrals Smoke', () => {
  test('@smoke should load referrals page', async ({ authenticatedPage }) => {
    const referralsPage = new ReferralsPage(authenticatedPage);
    await referralsPage.goto();
    await referralsPage.assertLoaded();
  });
});

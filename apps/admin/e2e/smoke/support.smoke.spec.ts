import { test } from '../fixtures/auth.fixture';
import { SupportPage } from '../pages/SupportPage';

test.describe('Support Smoke', () => {
  test('@smoke should load support page', async ({ authenticatedPage }) => {
    const supportPage = new SupportPage(authenticatedPage);
    await supportPage.goto();
    await supportPage.assertLoaded();
  });
});

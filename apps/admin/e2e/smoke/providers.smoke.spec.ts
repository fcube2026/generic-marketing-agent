import { test } from '../fixtures/auth.fixture';
import { ProvidersPage } from '../pages/ProvidersPage';

test.describe('Providers Smoke', () => {
  test('@smoke should load providers page with tabs', async ({ authenticatedPage }) => {
    const providersPage = new ProvidersPage(authenticatedPage);
    await providersPage.goto();
    await providersPage.assertLoaded();
    await providersPage.openTab('Active');
  });
});

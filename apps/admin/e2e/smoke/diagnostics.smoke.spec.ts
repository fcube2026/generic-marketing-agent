import { test } from '../fixtures/auth.fixture';
import { DiagnosticsPage } from '../pages/DiagnosticsPage';

test.describe('Diagnostics Smoke', () => {
  test('@smoke should load diagnostics coordination page', async ({ authenticatedPage }) => {
    const diagnosticsPage = new DiagnosticsPage(authenticatedPage);
    await diagnosticsPage.goto();
    await diagnosticsPage.assertLoaded();
  });
});

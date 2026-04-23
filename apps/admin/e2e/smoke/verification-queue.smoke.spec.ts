import { test } from '../fixtures/auth.fixture';
import { VerificationQueuePage } from '../pages/VerificationQueuePage';

test.describe('Verification Queue Smoke', () => {
  test('@smoke should load verification queue', async ({ authenticatedPage }) => {
    const verificationQueuePage = new VerificationQueuePage(authenticatedPage);
    await verificationQueuePage.goto();
    await verificationQueuePage.assertLoaded();
  });
});

import { test, expect } from '../fixtures/auth.fixture';
import { VerificationQueuePage } from '../pages/VerificationQueuePage';

test.describe('Verification Queue Regression', () => {
  test('@regression should approve a pending provider from the queue', async ({ authenticatedPage }) => {
    let approveCalls = 0;

    await authenticatedPage.route('**/admin/providers/*/verify', async (route) => {
      approveCalls += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    const queuePage = new VerificationQueuePage(authenticatedPage);
    await queuePage.goto();
    await queuePage.assertLoaded();
    await queuePage.approveFirstProvider();

    await expect.poll(() => approveCalls).toBe(1);
    await expect(authenticatedPage.getByText(/provider approved successfully/i)).toBeVisible();
  });

  test('@regression should render the empty queue state', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/admin/providers/pending', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    const queuePage = new VerificationQueuePage(authenticatedPage);
    await queuePage.goto();
    await queuePage.assertQueueEmpty();
  });
});
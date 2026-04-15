import { test, expect } from '../fixtures/auth.fixture';
import { ProvidersPage } from '../pages/ProvidersPage';
import { VerificationQueuePage } from '../pages/VerificationQueuePage';

test.describe('Providers Regression', () => {
  test('@regression should perform verification queue approve flow', async ({ authenticatedPage }) => {
    let approved = false;
    await authenticatedPage.route('**/admin/providers/*/verify', async (route) => {
      approved = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    const queuePage = new VerificationQueuePage(authenticatedPage);
    await queuePage.goto();
    await queuePage.approveFirstProvider();
    await expect.poll(() => approved).toBeTruthy();
  });

  test('@regression should perform provider reject flow', async ({ authenticatedPage }) => {
    let rejectCalls = 0;
    await authenticatedPage.route('**/admin/providers/*/reject', async (route) => {
      rejectCalls += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    const providersPage = new ProvidersPage(authenticatedPage);
    await providersPage.goto();
    await providersPage.openTab('Pending');
    await providersPage.openRejectModalForProvider('Dr. Priya Sharma');
    await providersPage.rejectWithReason('Incomplete verification docs');

    await expect.poll(() => rejectCalls).toBe(1);
  });

  test('@regression should show empty state when providers API fails', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/admin/providers**', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'failure' }) }),
    );

    const providersPage = new ProvidersPage(authenticatedPage);
    await providersPage.goto();
    await providersPage.assertEmptyState();
  });
});

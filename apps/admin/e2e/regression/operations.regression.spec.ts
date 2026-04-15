import { test, expect } from '../fixtures/auth.fixture';
import { DiagnosticsPage } from '../pages/DiagnosticsPage';
import { PayoutsPage } from '../pages/PayoutsPage';
import { ReferralsPage } from '../pages/ReferralsPage';

test.describe('Operations Regression', () => {
  test('@regression should update diagnostics status and upload result', async ({ authenticatedPage }) => {
    let diagnosticsUpdateCalls = 0;
    let uploadCalls = 0;

    await authenticatedPage.route('**/admin/diagnostics**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'diag-1',
              testType: 'CBC',
              notes: 'Follow-up',
              status: 'REQUESTED',
              scheduledAt: null,
              createdAt: '2026-04-10T10:00:00.000Z',
              booking: { id: 'b-1', patient: { name: 'Ravi Kumar' }, provider: { name: 'Dr. Priya Sharma' } },
              labResults: [],
            },
            {
              id: 'diag-2',
              testType: 'LFT',
              notes: 'Upload required',
              status: 'COLLECTED',
              scheduledAt: '2026-04-10T10:00:00.000Z',
              createdAt: '2026-04-10T10:00:00.000Z',
              booking: { id: 'b-2', patient: { name: 'Asha Verma' }, provider: { name: 'Dr. Karan Mehta' } },
              labResults: [],
            }
          ],
          total: 2,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      }),
    );

    await authenticatedPage.route('**/diagnostics/*', async (route) => {
      if (route.request().method() === 'PUT') diagnosticsUpdateCalls += 1;
      if (route.request().method() === 'POST') uploadCalls += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    const diagnosticsPage = new DiagnosticsPage(authenticatedPage);
    await diagnosticsPage.goto();
    await diagnosticsPage.scheduleFirstRequest();
    await diagnosticsPage.uploadResult('https://example.com/lab-result.pdf', 'Automated upload');

    await expect.poll(() => diagnosticsUpdateCalls).toBe(1);
    await expect.poll(() => uploadCalls).toBe(1);
  });

  test('@regression should process payout and update referral statuses', async ({ authenticatedPage }) => {
    let payoutProcessCalls = 0;
    let referralUpdateCalls = 0;

    await authenticatedPage.route('**/admin/payouts/*/process', async (route) => {
      payoutProcessCalls += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await authenticatedPage.route('**/admin/referrals', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'ref-1',
            specialistType: 'Cardiologist',
            notes: 'urgent',
            status: 'RECOMMENDED',
            createdAt: '2026-04-10T10:00:00.000Z',
            updatedAt: '2026-04-10T10:00:00.000Z',
            booking: { id: 'b-1', patient: { name: 'Ravi Kumar' }, provider: { name: 'Dr. Priya Sharma' } },
          },
        ]),
      }),
    );

    await authenticatedPage.route('**/referrals/*', async (route) => {
      referralUpdateCalls += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    const payoutsPage = new PayoutsPage(authenticatedPage);
    await payoutsPage.goto();
    await payoutsPage.markFirstPendingProcessed();

    const referralsPage = new ReferralsPage(authenticatedPage);
    await referralsPage.goto();
    await referralsPage.markFirstRecommendedBooked();

    await expect.poll(() => payoutProcessCalls).toBe(1);
    await expect.poll(() => referralUpdateCalls).toBe(1);
  });
});

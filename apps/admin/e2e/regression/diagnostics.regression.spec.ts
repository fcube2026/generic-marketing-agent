import { test, expect } from '../fixtures/auth.fixture';
import { DiagnosticsPage } from '../pages/DiagnosticsPage';

test.describe('Diagnostics Regression', () => {
  test('@regression should update diagnostic request status', async ({ authenticatedPage }) => {
    let updateCalls = 0;

    await authenticatedPage.route('**/api/v1/admin/diagnostics?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'diag-1',
              testType: 'CBC',
              notes: 'Fasting required',
              status: 'REQUESTED',
              scheduledAt: null,
              createdAt: '2026-04-10T10:00:00.000Z',
              booking: {
                id: 'booking-1',
                patient: { name: 'Ravi Kumar' },
                provider: { name: 'Dr. Priya Sharma' },
              },
              labResults: [],
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      });
    });

    await authenticatedPage.route('**/api/v1/diagnostics/*', async (route) => {
      updateCalls += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    const diagnosticsPage = new DiagnosticsPage(authenticatedPage);
    await diagnosticsPage.goto();
    await diagnosticsPage.assertLoaded();
    await diagnosticsPage.scheduleFirstRequest();

    await expect.poll(() => updateCalls).toBe(1);
  });

  test('@regression should upload a lab result for a collected request', async ({ authenticatedPage }) => {
    let uploadCalls = 0;

    await authenticatedPage.route('**/api/v1/admin/diagnostics?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'diag-2',
              testType: 'Lipid Profile',
              notes: 'Urgent',
              status: 'COLLECTED',
              scheduledAt: '2026-04-10T10:00:00.000Z',
              createdAt: '2026-04-10T08:00:00.000Z',
              booking: {
                id: 'booking-2',
                patient: { name: 'Neha Patel' },
                provider: { name: 'Dr. Arjun Rao' },
              },
              labResults: [],
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      });
    });

    await authenticatedPage.route('**/api/v1/diagnostics/*/result', async (route) => {
      uploadCalls += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    const diagnosticsPage = new DiagnosticsPage(authenticatedPage);
    await diagnosticsPage.goto();
    await diagnosticsPage.assertLoaded();
    await diagnosticsPage.uploadResult('https://example.com/report.pdf', 'Uploaded from regression test');

    await expect.poll(() => uploadCalls).toBe(1);
  });
});
import { test, expect } from '../fixtures/auth.fixture';
import { ReferralsPage } from '../pages/ReferralsPage';

test.describe('Referrals Regression', () => {
  test('@regression should update a referral from recommended to booked', async ({ authenticatedPage }) => {
    let updateCalls = 0;

    await authenticatedPage.route('**/api/v1/admin/referrals', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'ref-1',
            specialistType: 'Cardiologist',
            notes: 'Needs follow-up',
            status: 'RECOMMENDED',
            createdAt: '2026-04-10T10:00:00.000Z',
            updatedAt: '2026-04-10T10:00:00.000Z',
            booking: {
              id: 'booking-1',
              patient: { name: 'Ravi Kumar' },
              provider: { name: 'Dr. Priya Sharma' },
            },
          },
        ]),
      });
    });

    await authenticatedPage.route('**/api/v1/referrals/*', async (route) => {
      updateCalls += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    const referralsPage = new ReferralsPage(authenticatedPage);
    await referralsPage.goto();
    await referralsPage.assertLoaded();
    await referralsPage.markFirstRecommendedBooked();

    await expect.poll(() => updateCalls).toBe(1);
  });

  test('@regression should render the referrals empty state', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/v1/admin/referrals', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    const referralsPage = new ReferralsPage(authenticatedPage);
    await referralsPage.goto();
    await referralsPage.assertEmptyState();
  });
});
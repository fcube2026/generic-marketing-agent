import { test, expect } from '../fixtures/auth.fixture';
import { BookingsPage } from '../pages/BookingsPage';
import bookings from '../test-data/bookings.json';

test.describe('Bookings Regression', () => {
  test('@regression should support status filter and pagination', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/admin/bookings**', async (route) => {
      const url = new URL(route.request().url());
      const status = url.searchParams.get('status');
      const page = Number(url.searchParams.get('page') || '1');
      const filtered = status
        ? bookings.items.filter((item) => item.status === status)
        : bookings.items;

      const pageSize = 1;
      const start = (page - 1) * pageSize;
      const data = filtered.slice(start, start + pageSize);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data,
          total: filtered.length,
          page,
          totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
        }),
      });
    });

    const bookingsPage = new BookingsPage(authenticatedPage);
    await bookingsPage.goto();
    await bookingsPage.assertLoaded();
    await bookingsPage.assertPaginationVisible();

    await bookingsPage.filterByStatus('COMPLETED');
    await expect(authenticatedPage.getByText('Asha Verma')).toBeVisible();

    await bookingsPage.filterByStatus('');
    await bookingsPage.goToNextPage();
    await expect(authenticatedPage.getByText('Asha Verma')).toBeVisible();
  });

  test('@regression should render empty state on API error fallback', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/admin/bookings**', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Server error' }) }),
    );

    const bookingsPage = new BookingsPage(authenticatedPage);
    await bookingsPage.goto();
    await bookingsPage.assertEmptyState();
  });
});

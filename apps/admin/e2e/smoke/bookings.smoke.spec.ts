import { test } from '../fixtures/auth.fixture';
import { BookingsPage } from '../pages/BookingsPage';

test.describe('Bookings Smoke', () => {
  test('@smoke should load bookings page and table', async ({ authenticatedPage }) => {
    const bookingsPage = new BookingsPage(authenticatedPage);
    await bookingsPage.goto();
    await bookingsPage.assertLoaded();
    await bookingsPage.assertTableVisible();
  });
});

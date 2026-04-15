import { test, expect } from '../fixtures/auth.fixture';
import { SupportPage } from '../pages/SupportPage';

test.describe('Support Regression', () => {
  test('@regression should render the support placeholder dashboard content', async ({ authenticatedPage }) => {
    const supportPage = new SupportPage(authenticatedPage);
    await supportPage.goto();
    await supportPage.assertLoaded();

    await expect(authenticatedPage.getByText('Email Support')).toBeVisible();
    await expect(authenticatedPage.getByText('Phone Support')).toBeVisible();
    await expect(authenticatedPage.getByText('24/7 availability')).toBeVisible();
  });
});
import { expect, type Locator, type Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.signInButton = page.getByRole('button', { name: 'Sign In' });
    this.errorAlert = page.getByText(/invalid credentials|unable to reach|login failed/i);
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async assertLoaded(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    await expect(this.page.getByTestId('login-form')).toBeVisible();
  }

  async assertErrorVisible(): Promise<void> {
    await expect(this.errorAlert.first()).toBeVisible();
  }
}

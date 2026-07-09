import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * EXEMPLE DE RÉFÉRENCE — Page Object.
 * Sert de modèle de style pour les Page Objects générés par @claude.
 * Les sélecteurs ci-dessous sont indicatifs : à ajuster sur le vrai DOM de rental-app (Phase 1).
 */
export class LoginPage extends BasePage {
  readonly path = '/login';

  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly submitButton: Locator;
  private readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    // Locators robustes : getByRole / getByLabel en priorité.
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/mot de passe|password/i);
    this.submitButton = page.getByRole('button', { name: /se connecter|log in|sign in/i });
    this.errorMessage = page.getByRole('alert');
  }

  /** Action métier : connexion complète. */
  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectLoginError(): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
  }
}

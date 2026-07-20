import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object — Connexion (/login). Sélecteurs validés sur le DOM réel de LocImmo.
 */
export class LoginPage extends BasePage {
  readonly path = '/login';

  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly submitButton: Locator;
  // ⚠️ L'erreur de login est un <div> texte au-dessus du formulaire, PAS un role=alert
  // (le role=alert de la page est un conteneur toast séparé, vide).
  // Suggestion côté app : ajouter data-testid="form-error" pour un sélecteur stable.
  private readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByRole('textbox', { name: 'Email' });
    this.passwordInput = page.getByRole('textbox', { name: 'Mot de passe', exact: true });
    // exact:true — la page a aussi un bouton « → Se connecter avec le compte démo »
    // qui matcherait sinon (strict mode violation).
    this.submitButton = page.getByRole('button', { name: 'Se connecter', exact: true });
    this.errorMessage = page.getByText('Email ou mot de passe incorrect');
  }

  /** Action métier : connexion complète. */
  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectLoginError(): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.page).toHaveURL(/\/login/);
  }
}

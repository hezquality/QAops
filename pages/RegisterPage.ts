import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import type { NewUser } from '@data/users';

/**
 * Page Object — Inscription (/register). Sélecteurs validés sur le DOM réel de LocImmo.
 * Après une inscription réussie, l'app redirige vers "/" et ouvre la session (cookie JWT).
 */
export class RegisterPage extends BasePage {
  readonly path = '/register';

  private readonly nameInput: Locator;
  private readonly emailInput: Locator;
  private readonly phoneInput: Locator;
  private readonly passwordInput: Locator;
  private readonly confirmPasswordInput: Locator;
  private readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.nameInput = page.getByRole('textbox', { name: 'Nom complet' });
    this.emailInput = page.getByRole('textbox', { name: 'Email' });
    this.phoneInput = page.getByRole('textbox', { name: 'Téléphone (optionnel)' });
    // exact:true : "Mot de passe" est un sous-texte de "Confirmer le mot de passe".
    this.passwordInput = page.getByRole('textbox', { name: 'Mot de passe', exact: true });
    this.confirmPasswordInput = page.getByRole('textbox', { name: 'Confirmer le mot de passe' });
    this.submitButton = page.getByRole('button', { name: "S'inscrire" });
  }

  /** Action métier : inscription complète (mot de passe = confirmation). */
  async register(user: NewUser): Promise<void> {
    await this.nameInput.fill(user.name);
    await this.emailInput.fill(user.email);
    if (user.phone) await this.phoneInput.fill(user.phone);
    await this.passwordInput.fill(user.password);
    await this.confirmPasswordInput.fill(user.password);
    await this.submitButton.click();
  }
}

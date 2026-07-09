import { Page, Locator, expect } from '@playwright/test';

/**
 * Component Object — barre de navigation (présente sur toutes les pages).
 * Reflète l'état d'auth (LIM-28). Utilise des assertions web-first car l'état
 * connecté n'apparaît qu'après le refetch du hook useAuth (GET /api/auth/me).
 */
export class NavbarComponent {
  private readonly greeting: (name: string) => Locator;
  readonly logoutButton: Locator;
  readonly loginLink: Locator;
  readonly myListingsLink: Locator;

  constructor(private readonly page: Page) {
    this.greeting = (name: string) => page.getByText(`Bonjour, ${name}`);
    this.logoutButton = page.getByRole('button', { name: 'Déconnexion' });
    this.loginLink = page.getByRole('link', { name: 'Connexion' });
    this.myListingsLink = page.getByRole('link', { name: 'Mes annonces' });
  }

  async expectLoggedIn(name?: string): Promise<void> {
    await expect(this.logoutButton).toBeVisible();
    if (name) await expect(this.greeting(name)).toBeVisible();
  }

  async expectLoggedOut(): Promise<void> {
    await expect(this.loginLink).toBeVisible();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
    await this.expectLoggedOut();
  }
}

import { Page, expect } from '@playwright/test';

/**
 * Classe de base pour tous les Page Objects.
 * Encapsule la page Playwright et fournit des helpers communs.
 * Les classes filles exposent des méthodes MÉTIER, pas des clics bruts.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** Chemin relatif de la page (surchargé par les filles). Ex: '/login'. */
  abstract readonly path: string;

  /** Navigue vers la page (baseURL vient de la config). */
  async goto(): Promise<void> {
    await this.page.goto(this.path);
    await this.expectLoaded();
  }

  /** Vérifie que la page est bien chargée (surchargé par les filles). */
  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(this.path));
  }
}

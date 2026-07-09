import { test as base } from '@playwright/test';
import { LoginPage } from '@pages/LoginPage';

/**
 * Fixtures QAops : injectent les Page Objects dans les tests.
 * Ajoute ici chaque nouveau Page Object pour qu'il soit disponible via déstructuration
 * dans les tests, sans `new` ni `beforeEach` répétitif.
 */
type Pages = {
  loginPage: LoginPage;
  // searchPage: SearchPage;  ← ajouter les futurs Page Objects ici
};

export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});

export { expect } from '@playwright/test';

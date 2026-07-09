import { test as base } from '@playwright/test';
import { LoginPage } from '@pages/LoginPage';
import { RegisterPage } from '@pages/RegisterPage';
import { NavbarComponent } from '@pages/components/NavbarComponent';

/**
 * Fixtures QAops : injectent les Page Objects / Components dans les tests.
 * Ajoute ici chaque nouveau Page Object pour qu'il soit disponible via déstructuration,
 * sans `new` ni `beforeEach` répétitif.
 */
type Pages = {
  loginPage: LoginPage;
  registerPage: RegisterPage;
  navbar: NavbarComponent;
  // searchPage: SearchPage;   ← futurs Page Objects
  // createListingPage: CreateListingPage;
};

export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },
  navbar: async ({ page }, use) => {
    await use(new NavbarComponent(page));
  },
});

export { expect } from '@playwright/test';

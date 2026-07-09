import { test, expect } from '@fixtures/pages.fixture';
import { validUser, invalidUsers } from '@data/users';

/**
 * EXEMPLE DE RÉFÉRENCE — spec.
 * Montre le style attendu : fixtures, POM, data-driven, tags de traçabilité,
 * assertions web-first. À adapter au vrai rental-app en Phase 1/4.
 */
test.describe('Authentification', () => {
  test('connexion réussie avec identifiants valides @JIRA-000 @smoke', async ({ loginPage, page }) => {
    test.info().annotations.push({ type: 'jira', description: 'JIRA-000' });

    await loginPage.goto();
    await loginPage.login(validUser.email, validUser.password);

    // Assertion web-first (auto-wait) — à ajuster selon l'app réelle.
    await expect(page).not.toHaveURL(/login/);
  });

  // Data-driven : un test par jeu de données invalide.
  for (const user of invalidUsers) {
    test(`connexion refusée — ${user.label} @JIRA-000 @regression`, async ({ loginPage }) => {
      test.info().annotations.push({ type: 'jira', description: 'JIRA-000' });

      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await loginPage.expectLoginError();
    });
  }
});

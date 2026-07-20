import { test, expect } from '@fixtures/pages.fixture';
import { makeUser, logoutAccountLabels } from '@data/users';

/**
 * LIM-11 — Déconnexion d'un utilisateur connecté.
 * DB Render vide/éphémère (free tier) : le compte est créé via /register avant le test.
 * Jeux de données Jira (compte locataire / compte bailleur) : LocImmo n'a pas de rôle
 * dédié à l'inscription, donc les deux jeux suivent le même flux (cf. data/users.ts).
 */
test.describe('Déconnexion LocImmo', () => {
  for (const accountLabel of logoutAccountLabels) {
    test(`un utilisateur connecté n'est plus reconnu après déconnexion - ${accountLabel} @LIM-11 @regression`, async ({
      page,
      registerPage,
      navbar,
    }) => {
      test.info().annotations.push({ type: 'jira', description: 'LIM-11' });

      // Warm-up : le service Render (free tier) peut être en cold start (~30-60s).
      await page.goto('/', { timeout: 60_000 });

      const user = makeUser({ name: `QA ${accountLabel}` });

      await registerPage.goto();
      await registerPage.register(user);
      await page.waitForURL('/');

      // Finding LIM-10/11 : la navbar ne reflète l'état connecté qu'après un rechargement.
      await page.reload();
      await navbar.expectLoggedIn(user.name);

      // Quand il se déconnecte -> alors il n'est plus reconnu comme connecté.
      await navbar.logout();

      // Et les espaces réservés aux membres (dépôt d'annonce, mes annonces) ne lui sont
      // plus accessibles : l'app redirige côté client vers /login.
      await page.goto('/create');
      await expect(page).toHaveURL(/\/login/);

      await page.goto('/my-listings');
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

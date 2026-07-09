import { test, expect } from '@fixtures/pages.fixture';
import { makeUser } from '@data/users';

/**
 * LIM-1 — Connexion réussie avec identifiants valides.
 * DB Render vide/éphémère (free tier) : le compte est créé via /register avant le test.
 */
test.describe('Authentification LocImmo', () => {
  test('connexion réussie avec identifiants valides @LIM-1 @smoke', async ({
    page,
    registerPage,
    loginPage,
    navbar,
  }) => {
    test.info().annotations.push({ type: 'jira', description: 'LIM-1' });

    // Warm-up : le service Render (free tier) peut être en cold start (~30-60s).
    await page.goto('/', { timeout: 60_000 });

    const user = makeUser();

    await registerPage.goto();
    await registerPage.register(user);
    // Quitte le formulaire d'inscription = l'inscription a été acceptée par l'API
    // (en cas d'erreur, l'app reste sur /register). Plus pertinent qu'un simple
    // toHaveURL('/') qui ne fait que présumer la destination exacte de la redirection.
    await expect(page).not.toHaveURL(/\/register/);

    // Finding LIM-10/11 : la navbar ne reflète l'état connecté qu'après un rechargement.
    await page.reload();
    await navbar.logout();

    await loginPage.goto();
    await loginPage.login(user.email, user.password);
    // Quitte le formulaire de connexion = la connexion a réussi (cf. LoginPage.expectLoginError
    // qui vérifie symétriquement le maintien sur /login en cas d'échec).
    await expect(page).not.toHaveURL(/\/login/);

    await page.reload();
    await navbar.expectLoggedIn(user.name);
  });
});

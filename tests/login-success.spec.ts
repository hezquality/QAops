import { test } from '@fixtures/pages.fixture';
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
    // Attend la fin de la redirection SPA avant de recharger (évite une race où
    // le reload interrompt la requête d'inscription en cours). Pure synchronisation :
    // l'assertion métier qui suit (navbar.expectLoggedIn) est ce qui valide le scénario.
    await page.waitForURL('/');

    // Finding LIM-10/11 : la navbar ne reflète l'état connecté qu'après un rechargement.
    await page.reload();
    await navbar.expectLoggedIn(user.name);
    await navbar.logout();

    await loginPage.goto();
    await loginPage.login(user.email, user.password);
    await page.waitForURL('/');

    await page.reload();
    await navbar.expectLoggedIn(user.name);
  });
});

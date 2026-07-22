import { test } from '@fixtures/pages.fixture';
import { makeUser } from '@data/users';
import { makeListing, myListingsScenarios } from '@data/listings';

/**
 * LIM-10 — Consultation de ses propres annonces par le bailleur (/my-listings).
 * DB Render vide/éphémère (free tier) : chaque bailleur est créé via /register avant le test.
 * Chaque scénario fait déposer une annonce par un AUTRE bailleur pour vérifier qu'elle
 * n'apparaît jamais dans l'espace "Mes annonces" du bailleur du jeu de données (isolation).
 */
test.describe('Mes annonces LocImmo', () => {
  test.beforeEach(async ({ page }) => {
    // Warm-up : le service Render (free tier) peut être en cold start (~30-60s).
    await page.goto('/', { timeout: 60_000 });
  });

  for (const scenario of myListingsScenarios) {
    test(`un bailleur retrouve l'ensemble de ses annonces sans celles d'un autre bailleur - ${scenario.label} @LIM-10 @regression`, async ({
      page,
      registerPage,
      navbar,
      createListingPage,
      myListingsPage,
    }) => {
      test.info().annotations.push({ type: 'jira', description: 'LIM-10' });

      // Un autre bailleur dépose sa propre annonce, pour vérifier qu'elle n'est jamais présentée.
      const otherLandlord = makeUser({ name: 'QA Autre Bailleur' });
      await registerPage.goto();
      await registerPage.register(otherLandlord);
      await page.waitForURL('/');

      const otherListing = makeListing({ title: `Annonce autre bailleur [${Date.now()}]` });
      await createListingPage.goto();
      await createListingPage.create(otherListing);
      await navbar.logout();

      // Le bailleur du jeu de données dépose ses propres annonces.
      const landlord = makeUser({ name: `QA ${scenario.label}` });
      await registerPage.goto();
      await registerPage.register(landlord);
      await page.waitForURL('/');

      const listingTitles: string[] = [];
      for (let i = 0; i < scenario.listingsCount; i += 1) {
        const listing = makeListing({ title: `Annonce ${scenario.label} ${i + 1} [${Date.now()}]` });
        listingTitles.push(listing.title);
        await createListingPage.goto();
        await createListingPage.create(listing);
      }

      // Quand il accède à l'espace regroupant ses annonces -> alors il retrouve l'ensemble
      // des annonces qu'il a déposées, et aucune annonce d'un autre bailleur ne lui est présentée.
      await myListingsPage.goto();
      await myListingsPage.expectOnlyListings(listingTitles);
    });
  }
});

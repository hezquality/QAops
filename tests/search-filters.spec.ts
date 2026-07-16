import { test } from '@fixtures/pages.fixture';
import { searchScenarios, noResultsScenario } from '@data/searches';

/**
 * LIM-3 — Recherche par ville et filtres avancés (page d'accueil LocImmo).
 * Page publique, aucune authentification requise. DB de démo Render (free tier)
 * éphémère : les assertions de résultats sont tolérantes (cf. SearchPage.expectResultsMatch).
 */
test.describe('Recherche & filtres LocImmo', () => {
  test.beforeEach(async ({ page }) => {
    // Warm-up : le service Render (free tier) peut être en cold start (~30-60s).
    await page.goto('/', { timeout: 60_000 });
  });

  for (const scenario of searchScenarios) {
    test(`recherche par ville et filtres avancés - ${scenario.label} @LIM-3 @regression`, async ({ searchPage }) => {
      test.info().annotations.push({ type: 'jira', description: 'LIM-3' });

      await searchPage.search(scenario);
      await searchPage.expectResultsMatch(scenario);
    });
  }

  test(`recherche sans résultat affiche l'état vide - ${noResultsScenario.label} @LIM-3 @regression`, async ({
    searchPage,
  }) => {
    test.info().annotations.push({ type: 'jira', description: 'LIM-3' });

    await searchPage.search(noResultsScenario);
    await searchPage.expectNoResults();
  });

  test('le clic sur "Plus de filtres" affiche les filtres avancés @LIM-3 @smoke', async ({ searchPage }) => {
    test.info().annotations.push({ type: 'jira', description: 'LIM-3' });

    await searchPage.expectAdvancedFiltersHidden();
    await searchPage.openAdvancedFilters();
  });

  test('le clic sur "Réinitialiser" vide tous les champs de recherche @LIM-3 @regression', async ({ searchPage }) => {
    test.info().annotations.push({ type: 'jira', description: 'LIM-3' });

    await searchPage.search({
      label: 'jdd réinitialisation',
      city: 'Paris',
      type: 'apartment',
      priceMin: 800,
      priceMax: 2000,
      roomsMin: 3,
    });

    await searchPage.resetFilters();
    await searchPage.expectFieldsCleared();
  });
});

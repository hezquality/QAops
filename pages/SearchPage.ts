import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import type { SearchCriteria, ListingType } from '@data/searches';

const TYPE_LABELS: Record<ListingType, string> = {
  all: 'Tous les types',
  apartment: 'Appartement',
  house: 'Maison',
};

/**
 * Page Object — Accueil / recherche & filtres (/). Sélecteurs validés sur le DOM réel de LocImmo.
 */
export class SearchPage extends BasePage {
  readonly path = '/';

  readonly cityInput: Locator;
  // Seul combobox du formulaire de recherche -> ciblage par rôle sans nom accessible
  // (l'app n'a pas de <label>/aria-label associé). Suggestion : aria-label="Type de bien".
  readonly typeSelect: Locator;
  readonly searchButton: Locator;
  readonly toggleFiltersButton: Locator;
  readonly resetFiltersButton: Locator;
  // Les <label> "Prix min"/"Prix max"/"Pièces min" ne sont pas associés (pas de for/id) :
  // le nom accessible retombe sur le placeholder. Suggestion : <label for="minPrice"> etc.
  readonly minPriceInput: Locator;
  readonly maxPriceInput: Locator;
  readonly minRoomsInput: Locator;
  readonly resultsCount: Locator;
  readonly noResultsHeading: Locator;
  readonly listingCards: Locator;

  constructor(page: Page) {
    super(page);
    this.cityInput = page.getByRole('textbox', { name: 'Rechercher par ville...' });
    this.typeSelect = page.getByRole('combobox');
    this.searchButton = page.getByRole('button', { name: 'Rechercher' });
    this.toggleFiltersButton = page.getByRole('button', { name: /^(Plus|Moins) de filtres$/ });
    this.resetFiltersButton = page.getByRole('button', { name: 'Réinitialiser les filtres' });
    // exact:true : getByPlaceholder fait un match substring par défaut, et "0" est inclus dans "5000".
    this.minPriceInput = page.getByPlaceholder('0', { exact: true });
    this.maxPriceInput = page.getByPlaceholder('5000', { exact: true });
    this.minRoomsInput = page.getByPlaceholder('1', { exact: true });
    this.resultsCount = page.getByText(/\d+ annonces? trouvée/);
    this.noResultsHeading = page.getByRole('heading', { name: 'Aucune annonce trouvée' });
    this.listingCards = page.getByRole('link').filter({ hasText: '€/mois' });
  }

  async expectAdvancedFiltersHidden(): Promise<void> {
    await expect(this.minPriceInput).toBeHidden();
    await expect(this.maxPriceInput).toBeHidden();
    await expect(this.minRoomsInput).toBeHidden();
    await expect(this.resetFiltersButton).toBeHidden();
  }

  async expectAdvancedFiltersVisible(): Promise<void> {
    await expect(this.minPriceInput).toBeVisible();
    await expect(this.maxPriceInput).toBeVisible();
    await expect(this.minRoomsInput).toBeVisible();
    await expect(this.resetFiltersButton).toBeVisible();
  }

  async openAdvancedFilters(): Promise<void> {
    await this.toggleFiltersButton.click();
    await this.expectAdvancedFiltersVisible();
  }

  /** Action métier : saisit les critères puis lance la recherche. */
  async search(criteria: SearchCriteria): Promise<void> {
    if (criteria.city) await this.cityInput.fill(criteria.city);
    if (criteria.type !== 'all') {
      await this.typeSelect.selectOption({ label: TYPE_LABELS[criteria.type] });
    }
    const hasAdvancedFilters =
      criteria.priceMin !== undefined || criteria.priceMax !== undefined || criteria.roomsMin !== undefined;
    if (hasAdvancedFilters) {
      await this.openAdvancedFilters();
      if (criteria.priceMin !== undefined) await this.minPriceInput.fill(String(criteria.priceMin));
      if (criteria.priceMax !== undefined) await this.maxPriceInput.fill(String(criteria.priceMax));
      if (criteria.roomsMin !== undefined) await this.minRoomsInput.fill(String(criteria.roomsMin));
    }
    // La grille se met à jour via un appel async (GET /api/listings) : on attend la réponse qui
    // correspond réellement à ces critères (et pas le fetch initial de montage, encore en vol).
    await Promise.all([
      this.page.waitForResponse((res) => this.matchesListingsResponse(res.url(), criteria)),
      this.searchButton.click(),
    ]);
  }

  async resetFilters(): Promise<void> {
    await Promise.all([
      this.page.waitForResponse((res) => res.url().includes('/api/listings')),
      this.resetFiltersButton.click(),
    ]);
  }

  private matchesListingsResponse(url: string, criteria: SearchCriteria): boolean {
    if (!url.includes('/api/listings')) return false;
    if (criteria.city && !url.includes(`city=${encodeURIComponent(criteria.city)}`)) return false;
    if (criteria.type !== 'all' && !url.includes(`type=${criteria.type}`)) return false;
    return true;
  }

  async expectFieldsCleared(): Promise<void> {
    await expect(this.cityInput).toHaveValue('');
    await expect(this.typeSelect).toHaveValue('');
    await expect(this.minPriceInput).toHaveValue('');
    await expect(this.maxPriceInput).toHaveValue('');
    await expect(this.minRoomsInput).toHaveValue('');
  }

  async expectNoResults(): Promise<void> {
    await expect(this.noResultsHeading).toBeVisible();
  }

  /** Lit les cartes d'annonces visibles et en extrait prix/nb de pièces (formats FR : espace fine insécable). */
  private async readVisibleListings(): Promise<Array<{ text: string; price: number; rooms: number }>> {
    const cards = await this.listingCards.all();
    const listings: Array<{ text: string; price: number; rooms: number }> = [];
    for (const card of cards) {
      const text = await card.innerText();
      // Espaces de séparation des milliers uniquement (jamais \s : il inclut \n et ferait
      // déborder la capture sur le texte précédent le prix, ex. un titre finissant par un chiffre).
      const price = Number(text.match(/([\d   ]+)\s?€\/mois/)?.[1]?.replace(/[\s  ]/g, ''));
      const rooms = Number(text.match(/(\d+)\s?pièces?/)?.[1]);
      listings.push({ text, price, rooms });
    }
    return listings;
  }

  /**
   * Assertion tolérante à l'état de la DB de démo (Render free tier, éphémère) :
   * soit la grille affiche des résultats cohérents avec les critères, soit l'état
   * "Aucune annonce trouvée" s'affiche (les deux sont des issues valides du scénario).
   */
  async expectResultsMatch(criteria: SearchCriteria): Promise<void> {
    await expect(this.resultsCount.or(this.noResultsHeading)).toBeVisible();

    if (await this.noResultsHeading.isVisible()) {
      return;
    }

    const listings = await this.readVisibleListings();
    await expect(this.resultsCount).toHaveText(new RegExp(`^${listings.length} annonces? trouvée`));

    for (const listing of listings) {
      if (criteria.city) {
        expect(listing.text.toLowerCase()).toContain(criteria.city.toLowerCase());
      }
      if (criteria.type !== 'all') {
        expect(listing.text).toContain(TYPE_LABELS[criteria.type]);
      }
      if (criteria.priceMin !== undefined) expect(listing.price).toBeGreaterThanOrEqual(criteria.priceMin);
      if (criteria.priceMax !== undefined) expect(listing.price).toBeLessThanOrEqual(criteria.priceMax);
      if (criteria.roomsMin !== undefined) expect(listing.rooms).toBeGreaterThanOrEqual(criteria.roomsMin);
    }
  }
}

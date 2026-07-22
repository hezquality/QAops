import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object — Mes annonces (/my-listings, protégée). Sélecteurs validés sur le DOM réel de LocImmo.
 */
export class MyListingsPage extends BasePage {
  readonly path = '/my-listings';

  private readonly listingCount: Locator;
  private readonly listingTitle: (title: string) => Locator;

  constructor(page: Page) {
    super(page);
    this.listingCount = page.getByText(/^\d+ annonces? publiée?s?$/);
    this.listingTitle = (title: string) => page.getByRole('heading', { level: 3, name: title });
  }

  /**
   * Vérifie que l'espace affiche exactement les annonces attendues (ni plus, ni moins) :
   * couvre à la fois "il retrouve l'ensemble des annonces qu'il a déposées" et
   * "aucune annonce appartenant à un autre bailleur ne lui est présentée" (LIM-10),
   * le comptage total des cartes exclut toute annonce en trop provenant d'un tiers.
   */
  async expectOnlyListings(titles: string[]): Promise<void> {
    const expectedCountText = titles.length === 1 ? '1 annonce publiée' : `${titles.length} annonces publiées`;
    await expect(this.listingCount).toHaveText(expectedCountText);
    await expect(this.page.getByRole('heading', { level: 3 })).toHaveCount(titles.length);
    for (const title of titles) {
      await expect(this.listingTitle(title)).toBeVisible();
    }
  }
}

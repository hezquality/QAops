import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import type { NewListing, ListingType } from '@data/listings';

const TYPE_LABELS: Record<ListingType, string> = {
  apartment: 'Appartement',
  house: 'Maison',
};

/**
 * Page Object — Dépôt d'annonce (/create, protégée). Sélecteurs validés sur le DOM réel de LocImmo.
 */
export class CreateListingPage extends BasePage {
  readonly path = '/create';

  private readonly titleInput: Locator;
  private readonly descriptionInput: Locator;
  private readonly typeSelect: Locator;
  private readonly priceInput: Locator;
  private readonly cityInput: Locator;
  private readonly addressInput: Locator;
  private readonly roomsInput: Locator;
  private readonly surfaceInput: Locator;
  private readonly furnishedCheckbox: Locator;
  private readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.titleInput = page.getByRole('textbox', { name: "Titre de l'annonce *" });
    this.descriptionInput = page.getByRole('textbox', { name: 'Description *' });
    this.typeSelect = page.getByRole('combobox', { name: 'Type de bien *' });
    this.priceInput = page.getByRole('spinbutton', { name: 'Loyer mensuel (€) *' });
    this.cityInput = page.getByRole('textbox', { name: 'Ville *' });
    this.addressInput = page.getByRole('textbox', { name: 'Adresse *' });
    this.roomsInput = page.getByRole('spinbutton', { name: 'Nombre de pièces *' });
    this.surfaceInput = page.getByRole('spinbutton', { name: 'Surface (m²) *' });
    this.furnishedCheckbox = page.getByRole('checkbox', { name: 'Meublé' });
    this.submitButton = page.getByRole('button', { name: "Publier l'annonce" });
  }

  /** Action métier : dépose une annonce complète, jusqu'à la redirection vers son détail. */
  async create(listing: NewListing): Promise<void> {
    await this.titleInput.fill(listing.title);
    await this.descriptionInput.fill(listing.description);
    if (listing.type !== 'apartment') {
      await this.typeSelect.selectOption({ label: TYPE_LABELS[listing.type] });
    }
    await this.priceInput.fill(String(listing.price));
    await this.cityInput.fill(listing.city);
    await this.addressInput.fill(listing.address);
    await this.roomsInput.fill(String(listing.rooms));
    await this.surfaceInput.fill(String(listing.surface));
    if (listing.furnished) await this.furnishedCheckbox.check();

    await Promise.all([this.page.waitForURL(/\/listing\/.+/), this.submitButton.click()]);
  }
}

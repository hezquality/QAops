/**
 * Jeux de données de test (data-driven) + factory — annonces (LIM-10 : "Mes annonces").
 * DB Render éphémère (free tier) : chaque test crée ses propres annonces via /create,
 * avec un titre unique par exécution pour pouvoir les retrouver sans ambiguïté.
 */
export type ListingType = 'apartment' | 'house';

export type NewListing = {
  title: string;
  description: string;
  type: ListingType;
  price: number;
  city: string;
  address: string;
  rooms: number;
  surface: number;
  furnished?: boolean;
};

let seq = 0;

/** Factory : génère une annonce valide (titre unique) pour éviter les collisions entre tests. */
export function makeListing(overrides: Partial<NewListing> = {}): NewListing {
  seq += 1;
  const unique = `${Date.now()}-${seq}`;
  return {
    // Le titre ne doit jamais se terminer par un nombre brut : la regex de lecture des cartes
    // dans SearchPage (`[\d\s]+€/mois`) est gourmande sur les retours à la ligne et absorberait
    // les chiffres du titre dans le prix lu si une annonce QAops apparaissait dans une recherche.
    title: `Annonce QA [${unique}]`,
    description: 'Annonce générée automatiquement pour les besoins des tests QAops.',
    type: 'apartment',
    price: 950,
    city: 'Paris',
    address: '12 rue de la Paix',
    rooms: 3,
    surface: 65,
    ...overrides,
  };
}

/** Jeux de données data-driven (LIM-10) : bailleur avec une seule annonce / plusieurs annonces. */
export const myListingsScenarios = [
  { label: 'bailleur avec une seule annonce', listingsCount: 1 },
  { label: 'bailleur avec plusieurs annonces', listingsCount: 2 },
] as const;

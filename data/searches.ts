/**
 * Jeux de données de test (data-driven) — recherche & filtres avancés (LIM-3).
 * DB de démo Render (free tier) éphémère : le nombre d'annonces peut varier voire être vide,
 * donc les assertions du SearchPage sont tolérantes (cf. SearchPage.expectResultsMatch).
 */
export type ListingType = 'all' | 'apartment' | 'house';

export type SearchCriteria = {
  label: string;
  city?: string;
  type: ListingType;
  priceMin?: number;
  priceMax?: number;
  roomsMin?: number;
};

export const searchScenarios: SearchCriteria[] = [
  { label: 'Paris - recherche large', city: 'Paris', type: 'all' },
  { label: 'Paris - appartement std', city: 'Paris', type: 'apartment', priceMin: 800, priceMax: 2000, roomsMin: 3 },
  { label: 'Paris - petit budget', city: 'Paris', type: 'apartment', priceMin: 400, priceMax: 900, roomsMin: 1 },
  { label: 'Paris - 2 pieces', city: 'Paris', type: 'apartment', priceMin: 1000, priceMax: 1800, roomsMin: 2 },
  { label: 'Paris - grand standing', city: 'Paris', type: 'house', priceMin: 2500, priceMax: 6000, roomsMin: 5 },
  { label: 'Lyon - appartement', city: 'Lyon', type: 'apartment', priceMin: 500, priceMax: 1200, roomsMin: 2 },
  { label: 'Bordeaux - maison', city: 'Bordeaux', type: 'house', priceMin: 1000, priceMax: 2500, roomsMin: 4 },
];

/** Cas limite : ville inexistante -> aucun résultat possible, quel que soit l'état de la DB. */
export const noResultsScenario: SearchCriteria = {
  label: 'Aucun résultat',
  city: 'Zzztown',
  type: 'all',
};

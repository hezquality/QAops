/**
 * Jeux de données de test (data-driven) + factory.
 * La DB Render démarre vide et se réinitialise (free tier) → les tests créent
 * leur propre compte via une factory qui génère un email unique par exécution.
 */
export type NewUser = {
  name: string;
  email: string;
  password: string;
  phone?: string;
};

let seq = 0;

/** Factory : génère un utilisateur unique (email horodaté) pour éviter les collisions (409). */
export function makeUser(overrides: Partial<NewUser> = {}): NewUser {
  seq += 1;
  const unique = `${Date.now()}-${seq}`;
  return {
    name: 'QA Demo',
    email: `qa+${unique}@locimmo.test`,
    password: 'Password123',
    ...overrides,
  };
}

/** Compte créé lors du smoke Phase 1 (existe tant que la DB Render n'est pas réinitialisée). */
export const demoUser: NewUser = {
  name: 'QA Demo',
  email: 'qa.demo@locimmo.test',
  password: 'Password123',
};

/** Identifiants invalides (data-driven) → message "Email ou mot de passe incorrect" (LIM-7). */
export const invalidCredentials = [
  { label: 'mauvais mot de passe', email: demoUser.email, password: 'wrong-password' },
  { label: 'email inconnu', email: 'nobody@locimmo.test', password: 'whatever' },
];

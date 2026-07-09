/**
 * Jeux de données de test (data-driven). Typés, sans secret en dur :
 * les identifiants réels viennent de process.env (voir .env.example).
 */
export type TestUser = {
  label: string;
  email: string;
  password: string;
};

export const validUser: TestUser = {
  label: 'utilisateur valide',
  email: process.env.RENTAL_APP_TEST_USER ?? 'demo@rental-app.test',
  password: process.env.RENTAL_APP_TEST_PASSWORD ?? 'changeme',
};

export const invalidUsers: TestUser[] = [
  { label: 'mauvais mot de passe', email: validUser.email, password: 'wrong-password' },
  { label: 'email inconnu', email: 'nobody@rental-app.test', password: 'whatever' },
];

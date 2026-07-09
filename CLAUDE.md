# QAops — Instructions pour la génération de tests

Ce repo contient les tests **Playwright + TypeScript** de l'application **rental-app**.
Les tests sont générés à partir de scénarios **Jira / Xray** puis livrés en **Pull Request** (revue humaine obligatoire).

## Mission quand on te demande un test (via issue `@claude`)

1. Lis le ticket Jira / test case Xray référencé dans l'issue (via MCP Atlassian si dispo, sinon depuis la description de l'issue).
2. Si besoin, explore l'UI de rental-app via le **Playwright MCP** pour identifier les sélecteurs réels.
3. Écris/mets à jour le(s) Page Object(s) puis le fichier de test.
4. Lance `npm test` (au moins le projet chromium) et corrige jusqu'au vert.
5. Ouvre une **PR** décrivant le scénario, liée au ticket. **Ne merge jamais** — l'humain approuve.

## Architecture (respecte-la strictement)

- `tests/` — fichiers `*.spec.ts` (les scénarios). **Aucun sélecteur brut ici.**
- `pages/` — Page Objects (un fichier par page/écran), héritant de `BasePage`.
- `fixtures/` — fixtures Playwright (`test.extend`) qui injectent les Page Objects.
- `data/` — jeux de données de test (typés).
- `utils/` — helpers transverses.

Imports via alias : `@pages/*`, `@fixtures/*`, `@data/*`, `@utils/*`.

## Design patterns imposés

- **Page Object Model** : chaque page = une classe. Les sélecteurs (`Locator`) et actions y sont encapsulés. Les tests appellent des méthodes métier (`login(user)`, `bookRental(...)`), jamais `page.click(...)` directement.
- **Fixtures** : les tests reçoivent leurs Page Objects via la fixture (voir `fixtures/pages.fixture.ts`) — pas de `new Page()` ni de `beforeEach` répétitif.
- **Locators robustes** : priorité `getByRole` > `getByLabel` > `getByTestId` > texte. **Interdit** : sélecteurs CSS/XPath fragiles liés au style. Si un `data-testid` manque côté app, propose-le en commentaire.
- **Assertions web-first** : `await expect(locator).toBeVisible()` etc. **Jamais** de `waitForTimeout` / sleep arbitraire.
- **Data-driven** : données externalisées dans `data/`, tests paramétrés si plusieurs jeux.
- **Factories/builders** pour construire des entités de test complexes.

## Traçabilité (obligatoire)

Chaque test est rattaché à son ticket via un **tag** dans le titre et une annotation :

```ts
test('réserve un logement disponible @JIRA-123 @smoke', async ({ loginPage, searchPage }) => {
  test.info().annotations.push({ type: 'jira', description: 'JIRA-123' });
  // ...
});
```

Tags utiles : `@smoke`, `@regression`, `@JIRA-xxx`.

## Conventions

- TypeScript strict, `async/await`, pas de `any` non justifié.
- Nommage : Page Objects en `PascalCase` + suffixe `Page`/`Component` ; specs en `kebab-case.spec.ts`.
- Un test = un scénario isolé et rejouable (pas de dépendance d'ordre entre tests).
- Secrets via `process.env` (voir `.env.example`) — jamais en dur.

## Commandes

- `npm test` — tous les tests | `npm run test:smoke` — smoke uniquement
- `npm run test:ui` — mode UI | `npm run report` — rapport HTML
- `npm run codegen` — générer un squelette depuis l'UI

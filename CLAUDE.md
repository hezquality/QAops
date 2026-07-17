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

## LocImmo — repères UI validés (pour générer des tests justes)

- **Base URL** : `RENTAL_APP_BASE_URL` (Render). ⚠️ Free tier : **DB SQLite vide au démarrage et éphémère** (reset au redeploy/spin-down après 15 min). → Les tests **créent leurs propres données** (inscription via `/register`) ; pas de compte préexistant. Prévoir un **warm-up** (1er GET) + timeouts généreux contre le cold start.
- **Routes** : `/` (accueil + recherche), `/register`, `/login`, `/create` (protégée), `/listing/[id]`, `/my-listings` (protégée).
- **Sélecteurs réels** (validés) :
  - Login : `getByRole('textbox', { name: 'Email' })`, `getByRole('textbox', { name: 'Mot de passe', exact: true })`, `getByRole('button', { name: 'Se connecter' })`.
  - Register : `Nom complet`, `Email`, `Téléphone (optionnel)`, `Mot de passe` (**exact:true**), `Confirmer le mot de passe`, bouton `S'inscrire`.
  - Navbar connecté : texte `Bonjour, <nom>` + bouton `Déconnexion` + liens `Déposer une annonce`/`Mes annonces`.
- **Erreur de login** : `getByText('Email ou mot de passe incorrect')` — ⚠️ c'est un **`<div>` texte**, PAS un `role=alert` (l'alert de la page est un conteneur vide). Proposer `data-testid="form-error"` côté app.
- **⚠️ Finding connu (candidat bug LIM-10/11)** : après inscription/connexion, l'app redirige vers `/` mais **la navbar ne reflète l'état connecté qu'après un rechargement** (`useAuth` ne refetch pas `/api/auth/me` sur navigation client) ; la session cookie est pourtant valide. Pour valider une session dans un test, **recharger la home** (`page.goto('/')`) avant d'asserter l'état connecté.
- **Page Objects déjà fournis** : `pages/BasePage.ts`, `LoginPage`, `RegisterPage`, `components/NavbarComponent`, fixtures dans `fixtures/pages.fixture.ts`, données/factory dans `data/users.ts`. **Réutilise-les** ; crée de nouveaux Page Objects pour les écrans non couverts.

## Tests de charge (JMeter) — dossier `load/`

Pour les tickets Jira de **test de charge/performance**, l'agent génère un **plan JMeter `.jmx`** dans `load/` (pas de test Playwright).

- **Fichiers** : `load/*.jmx`. Un fichier de référence : `load/listings-smoke.jmx` — **réutilise sa structure**.
- **Cible paramétrable** (jamais en dur) : `HOST` via `${__P(host,locimmo.onrender.com)}`, `PROTOCOL` via `${__P(protocol,https)}`. Le HTTP Sampler utilise `domain=${HOST}`, `protocol=${PROTOCOL}`.
- **Charge paramétrable** : `THREADS` via `${__P(threads,2)}`, `LOOPS` via `${__P(loops,30)}`. Défauts **légers** (2 users) — LocImmo tourne sur Render free, ne PAS générer de charge lourde par défaut.
- **Traçabilité** : mettre `@LIM-xxx` dans le `testname` du TestPlan.
- **Assertions** : au minimum une `ResponseAssertion` sur le code HTTP (200). Si le ticket fixe des seuils (p95, % erreurs), les rappeler en commentaire — la CI mesure et publie p95/erreurs/latence.
- **Scénario depuis Jira** : dérive endpoint(s), charge (users/durée), et seuils du ticket. Un ThreadGroup par profil de charge si plusieurs.
- La CI (`.github/workflows/load-report.yml`) exécute `jmeter -n -t <plan>.jmx -Jhost=... -Jthreads=2 -Jloops=30` et publie un **rapport de perf** sur la PR.

### Best practices JMeter (obligatoires — issues des recommandations Apache + terrain OSS)

- **1 plan `.jmx` = 1 scénario documenté** (pas de « kitchen sink »). Nom du plan explicite + tag `@LIM-xxx`.
- **`HTTP Request Defaults`** (config element) : y mettre `domain=${HOST}`, `protocol=${PROTOCOL}` une seule fois ; les samplers n'y remettent que le `path` et la `method`.
- **`Transaction Controller`** : grouper les samplers d'un même parcours métier (ex. « Inscription+Login+Dépôt ») → le rapport agrège **par transaction** (temps du parcours, pas seulement par requête). `generateParentSample=true`.
- **Timers / think-time** : ajouter un `ConstantTimer` (ou `GaussianRandomTimer`/`UniformRandomTimer`) pour espacer les requêtes et ne pas matraquer le serveur — réaliste et gentil pour Render free. Paramétrable `${__P(think,500)}` ms.
- **Pas de listeners dans le plan** (View Results Tree, Aggregate…) : ils plombent la charge. Les résultats viennent de `-l results.jtl -e -o report` (CI).
- **Non-GUI uniquement** pour l'exécution (le GUI sert à lire/éditer). Déjà géré par la CI.
- **Ouvrable en GUI (`guiclass` exacts)** : chaque élément doit porter le nom de classe GUI **réel** de JMeter, sinon l'ouverture dans l'IHM échoue en `ClassNotFoundException` (l'exécution non-GUI, elle, ignore `guiclass` — le bug passe donc inaperçu en CI). Pièges fréquents : `CookieManager` → `guiclass="CookiePanel"` (⚠️ **PAS** `CookiePanelGUI`) ; `CacheManager` → `CacheManagerGui` ; `CSVDataSet` → `TestBeanGUI`. En cas de doute, **copier le `guiclass` depuis un élément équivalent de `load/listings-smoke.jmx`** plutôt que l'inventer.
- **Données externalisées** : JDD dans `load/data/*.csv` (jamais en dur). Un `.jmx` = logique, un `.csv` = données.
- **Scripting** : `JSR223` en **groovy** (jamais BeanShell — obsolète/lent).
- **Corrélation** : extraire tout identifiant dynamique (token, id de session) et le réutiliser — jamais de valeur figée entre étapes.
- **Assertions ciblées** (code HTTP par étape) ; éviter d'en abuser (surcoût). Les **seuils SLA** (p95, % erreurs) du ticket sont vérifiés par le rapport CI.
- **Paramétrage** : tout via `${__P(...)}` (host, protocol, threads, loops, think) → surchargeable en CI/local sans éditer le `.jmx`.

### Design pattern — parcours avancés (JDD, auth, extraction, cookies)

Quand le ticket décrit un **parcours multi-étapes** (ex. création de compte → login → action authentifiée), le plan `.jmx` doit assembler ces briques JMeter (une par besoin) :

- **JDD (jeux de données)** → `CSVDataSet` lisant `load/data/<x>.csv` (chemin relatif au `.jmx`), `variableNames` = colonnes, `ignoreFirstLine=true`, `recycle=true`, `shareMode=shareMode.all`. Les colonnes deviennent des variables `${col}`.
- **Données uniques** (éviter les collisions email/unicité) → `JSR223PreProcessor` (groovy) : `vars.put("EMAIL", "u_" + ctx.getThreadNum() + "_" + System.currentTimeMillis() + "@…")`. Réutiliser `${EMAIL}` dans les étapes suivantes.
- **Corps JSON** → `HeaderManager` `Content-Type: application/json` (au niveau du Thread Group) + sur chaque sampler POST `HTTPSampler.postBodyRaw=true` avec le JSON dans l'argument (échapper les `"` en `&quot;`).
- **Gestion des cookies / session** → `CookieManager` (au niveau du Thread Group) : capture le cookie JWT `token` (httpOnly) posé par register/login et le renvoie automatiquement aux requêtes suivantes → l'auth « passe » sans manip.
- **Extraction de variables** :
  - `JSONPostProcessor` (JSON Extractor) pour lire une valeur du **corps** (ex. `USER_ID` via `$.user.id`).
  - `RegexExtractor` avec `useHeaders=true` pour lire le **token dans l'en-tête** `Set-Cookie` (regex `token=([^;]+)`, template `$1$`, refname `TOKEN`).
- **Assertions par étape** → `ResponseAssertion` sur le code HTTP attendu (201 register, 200 login, 201 dépôt…).
- **Enchaînement** : les samplers d'un même Thread Group s'exécutent dans l'ordre ; place les extracteurs comme **enfants** du sampler dont ils lisent la réponse.
- **Action unique par utilisateur (une seule fois, pas à chaque itération)** → `Once Only Controller` (`testclass="OnceOnlyController"`, `guiclass="OnceOnlyControllerGui"`) : ses enfants ne s'exécutent qu'à la **1re itération de chaque thread**. Idéal pour un **onboarding** (inscription) réalisé une fois, alors que la connexion + les actions se rejouent à chaque boucle. À préférer au `setUp Thread Group` quand l'action « unique » doit rester **dans** le parcours du VU (et non dans une phase d'amorçage séparée).
- **Branche conditionnelle (exécuter selon une condition métier)** → `If Controller` (`testclass="IfController"`, `guiclass="IfControllerPanel"`) avec `IfController.useExpression=true` et une condition **groovy** renvoyant un booléen, typiquement pilotée par une colonne du JDD : `${__groovy(vars.get("role")=="bailleur",)}`. Mettre `IfController.evaluateAll=false`. Un `If Controller` par branche (ex. « Si bailleur » vs « Si locataire »).
- **Réutilisation OBLIGATOIRE des variables extraites (pas d'extracteur mort)** → toute variable corrélée doit servir ensuite : dans un **path** (`GET /api/listings/${LISTING_ID}`), un **corps**, un **header**, ou au minimum une **assertion**. Ex. : `USER_ID` vérifié dans la réponse `/api/auth/me` ; `LISTING_ID` (extrait du dépôt) rejoué en GET pour confirmer la publication ; `FIRST_ID` (1er résultat de recherche `$.listings[0].id`) rejoué en consultation. ⚠️ LocImmo étant en **auth par cookie httpOnly**, ne PAS fabriquer un header `Authorization: Bearer ${TOKEN}` (l'app l'ignore) : le `CookieManager` porte la session ; `TOKEN` sert alors de **preuve de capture** (assertion « non vide »), pas de header.

Ordre type d'un parcours complet : `CSVDataSet` + `CookieManager` + `HeaderManager` (config), puis **`Once Only Controller` → `Register`** (action unique, assertion 201) ; puis, à chaque itération, `Login` (assertion 200 + JSON/Regex extractors) → **`If Controller` par rôle** → `Action authentifiée` (assertion + **réutilisation** des variables extraites). Tout reste **paramétrable** (`__P host/protocol/threads/loops`) et en **charge légère** par défaut.

## Commandes

- `npm test` — tous les tests | `npm run test:smoke` — smoke uniquement
- `npm run test:ui` — mode UI | `npm run report` — rapport HTML
- `npm run codegen` — générer un squelette depuis l'UI

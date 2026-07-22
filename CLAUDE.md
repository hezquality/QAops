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
- **API (endpoints — sert à traduire un parcours métier en appels HTTP, ex. tests de charge)** :
  - `POST /api/auth/register` `{name,email,phone?,password,confirmPassword}` → **201** (crée un compte).
  - `POST /api/auth/login` `{email,password}` → **200** ; pose le cookie JWT httpOnly `token` (`Set-Cookie`) ; corps `{ user: { id, name, email, … } }`.
  - `GET /api/auth/me` → **200** `{ user: {…} }` (session courante ; nécessite le cookie).
  - `POST /api/auth/logout` → **200/204** (déconnexion).
  - `GET /api/listings` → **200** `{ "listings": [ … ] }` ; filtres **vérifiés le 22/07** et cumulables : `?city=<ville>`, `?minPrice=`, `?maxPrice=`, `?type=apartment|house`. Ex. `?city=Lyon&minPrice=500&maxPrice=900`.
  - `GET /api/listings/<id>` → **200** (détail d'une annonce) · **404** si l'annonce n'existe pas ou a été supprimée.
  - `POST /api/listings` `{title,description,type("apartment"|"house"),price,city,address,rooms,surface,furnished}` → **201** (dépôt, authentifié). ⚠️ **Le corps est enveloppé** : `{ "listing": { "id": "<uuid>", … } }` — l'extraction se fait sur **`$.listing.id`**, PAS `$.id` (piège vérifié le 22/07 ; `$.id` ne résout pas et casse la corrélation en silence). L'`id` est un **UUID**, pas un entier.
  - `DELETE /api/listings/<id>` → **200** `{ "success": true }` (authentifié, propriétaire de l'annonce). Vérifié le 22/07 : le `GET` suivant renvoie bien **404**.
  - Mapping métier : « créer son compte » = `POST /api/auth/register` ; « se connecter » = `POST /api/auth/login` ; « rechercher » = `GET /api/listings?city=…&minPrice=…&maxPrice=…` ; « consulter une annonce » = `GET /api/listings/<id>` ; « déposer une annonce » = `POST /api/listings` ; « retirer une annonce » = `DELETE /api/listings/<id>` ; « se déconnecter » = `POST /api/auth/logout`.
- **Sélecteurs réels** (validés) :
  - Login : `getByRole('textbox', { name: 'Email' })`, `getByRole('textbox', { name: 'Mot de passe', exact: true })`, `getByRole('button', { name: 'Se connecter', exact: true })`. ⚠️ **`exact: true` obligatoire** sur le bouton : la page a aussi un bouton `→ Se connecter avec le compte démo` qui matcherait sinon (strict mode violation).
  - Register : `Nom complet`, `Email`, `Téléphone (optionnel)`, `Mot de passe` (**exact:true**), `Confirmer le mot de passe`, bouton `S'inscrire`.
  - Navbar connecté : texte `Bonjour, <nom>` + bouton `Déconnexion` + liens `Déposer une annonce`/`Mes annonces`.
- **Erreur de login** : `getByText('Email ou mot de passe incorrect')` — ⚠️ c'est un **`<div>` texte**, PAS un `role=alert` (l'alert de la page est un conteneur vide). Proposer `data-testid="form-error"` côté app.
- **⚠️ Finding connu (bug LocImmo, non tracé dans Jira — ne pas confondre avec les tickets LIM-10/LIM-11 qui sont des scénarios métier)** : après inscription/connexion, l'app redirige vers `/` mais **la navbar ne reflète l'état connecté qu'après un rechargement** (`useAuth` ne refetch pas `/api/auth/me` sur navigation client) ; la session cookie est pourtant valide. Pour valider une session dans un test, **recharger la home** (`page.goto('/')`) avant d'asserter l'état connecté.
- **Page Objects déjà fournis** : `pages/BasePage.ts`, `LoginPage`, `RegisterPage`, `components/NavbarComponent`, fixtures dans `fixtures/pages.fixture.ts`, données/factory dans `data/users.ts`. **Réutilise-les** ; crée de nouveaux Page Objects pour les écrans non couverts.

## Tests de charge (JMeter) — convention ATAKAMA « PH » (dossier `load/`)

Pour les tickets Jira de **test de charge/performance**, l'agent génère un **plan JMeter `.jmx`** dans `load/` (pas de test Playwright), **au format du template partenaire ATAKAMA**.

> **Doctrine (imposée par l'équipe perf / cockpit `ph_jmeter`)** : l'agent génère **la logique métier** (transactions + fonctions réutilisables + JDD), **PAS l'injection ni les profils de charge**. L'injection, les paliers, le nombre de VUs, ramp/hold et le workload mixte sont posés et modifiés **automatiquement par le cockpit / l'agent ph_jmeter**. **Ne jamais générer** de `UltimateThreadGroup`, paliers, `ConstantThroughputTimer`, ni de profil de charge.

- **Template de référence (à réutiliser tel quel)** : `load/templates/PH_Template_Web_Workload.jmx`. **Copie sa structure et ses briques techniques verbatim** (blocs UDV, config globale, `FONCTIONS_INTERNES`) ; n'invente rien qui existe déjà dedans.
- **Fichiers produits** : `load/<projet>.jmx` + les JDD `load/data/<PROJET>-TRxx.csv`.

### Ce que l'agent GÉNÈRE vs NE génère PAS

| ✅ Génère (logique métier) | ❌ Ne génère PAS (géré par le cockpit) |
|---|---|
| Fragments `TRANSACTIONS`, `FONCTIONS`, `FONCTIONS_INTERNES` | Thread Groups d'injection / `UltimateThreadGroup` |
| Blocs `UDV_*` (paramétrage `${__P(...)}`) | Paliers, VUs, `PctVus`, `tRamp`, `tHold`, `NbPaliers` |
| CSV de logins par transaction | Workload mixte / répartition de charge |
| Config globale (Cookie/Cache/Header/HTTP Defaults) | `ConstantThroughputTimer`, profils de charge |

**Inclure un `ThreadGroup` « Tests TRxx » DÉSACTIVÉ par transaction** (1 VU / 1 boucle, appelant la transaction via `ModuleController`) : la CI `load-report.yml` les **active automatiquement** pour un **tir unitaire de validation** (vérifie que les transactions s'exécutent), sans jamais jouer de charge. Ne jamais laisser de thread group d'injection actif.

> ### 📌 UN SEUL PLAN PAR PROJET — on l'enrichit, on ne le duplique pas
>
> Le plan de charge de LocImmo est **`load/locimmo.jmx`**, et il est **unique**.
> Chaque ticket de charge ajoute **une transaction** à ce plan existant ; il ne crée
> **jamais** un second `.jmx`.
>
> **Pourquoi** : les transactions d'un même projet partagent la config globale, les
> `FONCTIONS_INTERNES`, et surtout les **briques métier** (`connexion`, `recherche`,
> `consulter_annonce`…). Des plans séparés dupliquent ces briques, divergent au premier
> correctif, et interdisent au cockpit de jouer un **workload mixte** — or c'est
> précisément son rôle : répartir la charge entre TR01, TR02, TR03 dans un seul tir.
>
> **Procédure d'enrichissement** (ticket → nouvelle transaction) :
> 1. Ouvrir `load/locimmo.jmx` et **relever la dernière transaction** présente (`TRxx`).
> 2. Ajouter la nouvelle sous le numéro suivant, dans le fragment `TRANSACTIONS`.
> 3. Compléter les blocs existants — **sans jamais réécrire les entrées des autres
>    transactions** : `NBE_TRxx`, `DUREE_TRxx` (+ `_MIN`), `CSV-TRxx`.
> 4. Créer son JDD `load/data/locimmo-TRxx.csv`.
> 5. Ajouter son `ThreadGroup` « Tests TRxx » **désactivé**.
> 6. **Factoriser** : si une action existe déjà dans `FONCTIONS` (connexion, recherche…),
>    l'appeler par `ModuleController` au lieu de la réécrire. Si la nouvelle transaction
>    introduit une action qui resservira, la placer dans `FONCTIONS`.
>
> Le diff d'un ticket de charge doit donc être **additif** : les transactions déjà
> présentes ressortent inchangées.

### Ossature (fragments `TestFragmentController` désactivés = bibliothèques)

```
TestPlan  <PROJET>_Web_Workload
├─ UDV_Tir · UDV_Projet · UDV_TransactionsEtapes · UDV_TransactionsDurees
│  · UDV_TransactionsFichiers · UDV_Interne          (tout en ${__P(nom,defaut)})
├─ Config : HTTP Request Defaults · CookieManager(CookiePanel) · CacheManager
│  · AuthManager · HeaderManager (entêtes navigateur + header `atk_etape`)
├─ FONCTIONS_INTERNES   (helpers JSR223 groovy — RÉUTILISER VERBATIM du template)
│   ├─ ErrorLog      → log erreurs (CSV + réponse) dans ${WORK}/data/${FERR}
│   └─ StartTrFiles  → crée l'entête des fichiers d'erreur
├─ FONCTIONS            (briques métier réutilisables : 1 GenericController + sampler(s))
│   ex. connexion · deconnexion · recherche · panier …  (appelées par ModuleController)
└─ TRANSACTIONS
    ├─ TR01_<nom> : CSV(${PROJET}-TR01) + _StartTr + ET01_01_… → ET01_02_… → …
    └─ TR02_<nom> : CSV(${PROJET}-TR02) + _StartTr + ET02_01_… → …
```

### Paramétrage — blocs `UDV_*` séparés par thème (Arguments), tout via `${__P(nom,defaut)}`
- `UDV_Tir` : `TIR`, `TYPE` (unitaire/qualif/performance/endurance/stress), `CONTINUE_ONERROR`, `TIMEOUT`, `HTTPPOOL`, `WORK`, `HOME`.
- `UDV_Projet` : `PROJET`, `HOST`, `PORT`, `PROTOCOLE`.
- `UDV_TransactionsEtapes` : `NBE_TRxx` = nombre d'étapes de la transaction.
- `UDV_TransactionsDurees` : `DUREE_TRxx` (durée cible normalisée) + `DUREE_TRxx_MIN` = `${__jexl3(${NBE_TRxx}*1000)}`.
- `UDV_TransactionsFichiers` : `CSV-TRxx` = `${PROJET}-TRxx.csv`.
- `UDV_Interne` : `FERR` = `${PROJET}-${TYPE}-${TIR}`, `atk_etape`.

### JDD (données) — 1 CSV par transaction
`CSVDataSet` lisant `data/${CSV-TRxx}` (= `data/${PROJET}-TRxx.csv`), colonnes **`login,pass`**, `shareMode.group`, `recycle=true`, `ignoreFirstLine=true`, `quotedData=true`, `delimiter=,`. (Réfs : `load/data/demo-TR01.csv`, `demo-TR02.csv`.) Les colonnes deviennent `${login}`, `${pass}`.

Pour un parcours **anonyme**, remplacer `login,pass` par les colonnes réellement variabilisées (ex. `ville`) — la convention porte sur *un CSV par transaction*, pas sur des noms de colonnes figés.

> #### ⛔ Un JDD de charge ne contient QUE des données nominales
>
> **Aucun cas négatif, aucune valeur volontairement absente ou invalide.** Une ligne
> qui ne ramène rien (ville sans annonce, compte inexistant, identifiant supprimé)
> casse la corrélation de l'étape suivante et **injecte des erreurs par construction** :
> le taux d'erreur et les temps de réponse remontés au cockpit deviennent
> ininterprétables, et le tir unitaire de la CI part en rouge sans qu'il y ait de bug.
>
> Les cas d'erreur se testent en **fonctionnel (Playwright)**, jamais dans un JDD de perf.
>
> Chaque ligne doit être **vérifiée exploitable** : si le JDD dépend de données de
> l'application (annonces, comptes), s'assurer qu'elles existent — ou prévoir une étape
> de création en amont, la base LocImmo étant éphémère.
>
> *(Leçon du 21/07 : deux générations indépendantes du même ticket ont toutes deux ajouté
> spontanément une ville fantôme au JDD, provoquant 50 % et 17 % d'itérations KO.)*

### Patron d'une transaction `TRxx_<nom>` (dans le fragment TRANSACTIONS)
1. `CSVDataSet` de la transaction (`data/${CSV-TRxx}`).
2. `_StartTr` (`GenericController`) : `InitTr` (JSR223 `vars.put("GP","TRxx")`) → `StartTrVars` (JSR223 qui calcule le pacing `ETP` pour **normaliser la durée** de la transaction à `DUREE_TRxx` sur `NBE_TRxx` étapes) → `StartTrFiles` (init fichiers d'erreurs, via `ModuleController` → FONCTIONS_INTERNES).
3. Les étapes `ETxx_yy_<nom>`, dans l'ordre.

### Patron d'une étape `ETxx_yy_<nom>` (un `TransactionController` par étape)
1. `_StartEtp` (`TestAction` pause 0 + `JSR223PreProcessor` `vars.put("atk_etape","ETxx_yy_<nom>")`) — traçabilité, renvoyée en header HTTP `atk_etape`.
2. **L'appel** : soit `ModuleController` → `FONCTIONS/<brique>` (réutilisation d'une fonction), soit un `HTTPSamplerProxy` inline nommé `yyyy_` (`domain=${HOST}`, `port=${PORT}`, `protocol=${PROTOCOLE}`).
3. `If KO` (`IfController`, `${__jexl3(${JMeterThread.last_sample_ok}==false)}`) → `setErrorLog` → `ModuleController` → FONCTIONS_INTERNES/`ErrorLog`.
4. `PauseFinEtape` (`TestAction` + `UniformRandomTimer` `delay=${__jexl3(${ETP}/3)}`, `range=${ETP}`) — think-time **normalisé** (pas de sleep arbitraire).
5. À partir de la 2e étape, **envelopper** l'étape dans un `IfController` « Continue ETxx_yy » (`${__jexl3(${CONTINUE_ONERROR}==true || ${JMeterThread.last_sample_ok}==true)}`) → arrêt propre du parcours en cas d'échec, sauf si `CONTINUE_ONERROR`.

### Fonctions réutilisables
- **Briques métier** → fragment `FONCTIONS` : une action = un `GenericController` nommé + son/ses `HTTPSamplerProxy`. Appelée depuis les étapes par `ModuleController` (jamais dupliquer un appel : le factoriser en fonction).
- **Helpers techniques** → fragment `FONCTIONS_INTERNES` (`ErrorLog`, `StartTrFiles`) : **réutiliser tels quels** depuis le template (JSR223 groovy, jamais BeanShell).

### Conventions de nommage (strictes)
- Transaction : `TRxx_<nom>` (ex. `TR01_navigation`). Étape : `ETxx_yy_<nom>` (ex. `ET01_02_menu`). Sampler inline : `yyyy_`. Variable groupe : `GP`. Label d'étape courant : `atk_etape`.

### Config globale (au niveau TestPlan, depuis le template)
`HTTP Request Defaults` (`domain=${HOST}`, `port=${PORT}`, `protocol=${PROTOCOLE}`, timeouts calculés depuis `TIMEOUT`) · `CookieManager` (`guiclass="CookiePanel"`) · `CacheManager` (`CacheManagerGui`) · `AuthManager` · `HeaderManager` (entêtes navigateur + header `atk_etape=${atk_etape}`).

### Règles transverses
- **`guiclass` exacts** (sinon `ClassNotFoundException` à l'ouverture GUI) : `CookieManager`→`CookiePanel` (**pas** `CookiePanelGUI`), `CacheManager`→`CacheManagerGui`, `CSVDataSet`→`TestBeanGUI`. En cas de doute, **copier le `guiclass` depuis le template**.
- **Corrélation/variabilisation** : extraire tout identifiant dynamique (token, id) via `JSONPostProcessor`/`RegexExtractor` posé en **enfant** du sampler, et le **réutiliser** (path/corps/header/assertion) — jamais d'extracteur mort, jamais de valeur figée entre étapes.
- **⛔ Jamais de `defaultValues` plausible sur un extracteur.** Une valeur de repli comme `1` ou `0` transforme un échec de corrélation en **faux positif** : l'étape suivante interroge une ressource sans rapport et renvoie `200`. Le KO devient invisible dans les KPI. Laisser `defaultValues` **vide**, ou poser une sentinelle explicitement invalide (`NO_LISTING`, `NOT_FOUND`) qui fera échouer l'étape de façon **visible**.
- **Une assertion sur le sampler qui alimente une corrélation.** Un `200` avec une liste vide est un succès pour JMeter mais un échec métier : sans assertion, le problème ne se manifeste qu'à l'étape suivante, loin de sa cause. Poser une `JSONAssertion`/`ResponseAssertion` sur l'élément extrait (ex. `$.listings[0].id` existe) pour que l'échec soit imputé à la bonne étape et parte dans `ErrorLog`.
- **Pas de listeners actifs** en charge (les `View Results Tree` du template sont réservés aux tirs unitaires, désactivés).
- **⚠️ Le template n'est pas conforme partout — l'hygiène est à ta charge.** `PH_Template_Web_Workload.jmx` est une base de travail, pas un modèle à copier aveuglément : il contient un `UltimateThreadGroup` **actif**, un ThreadGroup « Recording », des listeners **activés**, et au moins une faute d'appariement `hashTree`. **Réutilise verbatim uniquement** `FONCTIONS_INTERNES`, la config globale et la structure des blocs `UDV_*` — et **retire** tout artefact d'injection, d'enregistrement ou de listener actif. « Verbatim » s'applique aux briques techniques, jamais à l'injection.
- **Traçabilité** : `@LIM-xxx` dans le `TestPlan.comments` (ou le nom du plan) ; le label `atk_etape` porte l'étape.
- **Scénario depuis Jira** : dérive de la description les transactions, les étapes de chaque parcours, les fonctions communes et les colonnes du/des CSV. **Rien sur l'injection** (charge, VUs, durée) — c'est le cockpit.
- **Cohérence STRICTE des noms de variables** : toute variable `${X}` utilisée doit être **définie à l'identique** — dans un bloc `UDV_*`, une colonne de CSV, ou extraite en amont. ⚠️ Piège classique : définir `CSV-TR01` puis écrire `${CSV-TR1}` (zéro manquant) → JMeter **n'échoue pas**, il laisse le littéral non résolu (`data/${CSV-TR1}`) → fichier/URL cassé, **silencieux en non-GUI**. Après génération, **relis chaque `${...}` et vérifie qu'il correspond exactement à une définition** (mêmes casse, tirets, zéros).
- **Structure d'arbre JMeter STRICTE (sinon `ClassCastException` au chargement)** : dans un `.jmx`, **chaque élément est suivi d'exactement UN `<hashTree>`** (ses enfants, éventuellement vide `<hashTree/>`). Séquence valide : `<Element/><hashTree>…</hashTree><Element/><hashTree/>…`. ❌ **Jamais deux `<hashTree/>` adjacents**, jamais un élément sans son `hashTree`. Le XML peut être *bien formé* et les balises *équilibrées* tout en étant **invalide pour JMeter** (`ClassCastException: ListedHashTree cannot be cast to TestElement`) — un simple sampler feuille = `</HTTPSamplerProxy><hashTree/>` (**un seul**). C'est le piège nº1 en écrivant un `.jmx` à la main : après génération, **vérifie l'appariement élément/hashTree** (la CI le contrôle aussi).
- **Variable `WORK`** : chemin d'écriture des logs d'erreur des fonctions internes. Le template a un défaut Windows (`C:/Projets/...`) — **redéfinis-le en relatif** (`${__P(work,./work)}`) et suppose que `work/data/` existe (la CI le crée + passe `-Jwork`).


## Commandes

- `npm test` — tous les tests | `npm run test:smoke` — smoke uniquement
- `npm run test:ui` — mode UI | `npm run report` — rapport HTML
- `npm run codegen` — générer un squelette depuis l'UI

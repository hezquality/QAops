# QAops

Tests **Playwright + TypeScript** de l'application **rental-app**, générés à partir de scénarios **Jira/Xray** par **Claude Code GitHub Actions (`@claude`)**, livrés en **Pull Request** avec revue humaine obligatoire.

## Pipeline

```
Jira/Xray ─▶ Issue GitHub (@claude) ─▶ GitHub Actions (claude.yml)
                                        │ lit le scénario (MCP Atlassian)
                                        │ explore l'UI (Playwright MCP)
                                        │ écrit le test (POM + fixtures)
                                        ▼
                                   Pull Request ─▶ 👤 revue ─▶ merge
```

## Démarrage local

```bash
cp .env.example .env      # renseigne RENTAL_APP_BASE_URL, etc.
npm install
npm run install:browsers
npm test                  # ou: npm run test:ui
```

## Structure

| Dossier | Rôle |
|---|---|
| `tests/` | Scénarios `*.spec.ts` (aucun sélecteur brut) |
| `pages/` | Page Objects (POM), héritent de `BasePage` |
| `fixtures/` | Fixtures Playwright injectant les Page Objects |
| `data/` | Jeux de données typés (data-driven) |
| `utils/` | Helpers transverses |

Conventions et patterns imposés : voir [`CLAUDE.md`](./CLAUDE.md).

## Générer un test

Ouvre une issue via le template **« 🧪 Génération de test »**, référence le ticket Jira/Xray, mentionne `@claude`.
Le workflow génère le test et ouvre une PR. **Aucun merge automatique** — validation humaine requise (branch protection).

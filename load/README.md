# Tests de charge — JMeter

Plans de charge JMeter (`*.jmx`) générés à partir de tickets Jira de **test de performance**, exécutés en CI (charge légère) avec rapport de perf sur la PR.

## Exécuter en local
```bash
# JMeter installé (brew install jmeter)
jmeter -n -t load/listings-smoke.jmx \
  -Jhost=locimmo.onrender.com -Jthreads=2 -Jloops=30 \
  -l results.jtl -e -o report
open report/index.html
```

## Paramètres (surchageables via -J)
| Propriété | Défaut | Rôle |
|---|---|---|
| `host` | `locimmo.onrender.com` | hôte cible (sans `https://`) |
| `protocol` | `https` | schéma |
| `threads` | `2` | utilisateurs simultanés |
| `loops` | `30` | itérations par utilisateur |

⚠️ LocImmo tourne sur **Render free tier** : garder une **charge légère**. Pour de la vraie charge, cibler un environnement dédié (`-Jhost=...`).

## CI
`.github/workflows/load-report.yml` exécute tous les `load/*.jmx` (2 users par défaut) et publie le résumé (p95, erreurs, latence) + le dashboard HTML en artefact. Déclenchable aussi à la main (**Run workflow**).

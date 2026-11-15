# Savoir-faire : la grande passe d'avant mise en production

À lire par Thomas seulement pour le temps 4 (voir `agents/thomas.md`). Le reste du savoir-faire des tests est dans `SKILL.md` : les limites extérieures, les comptes de test et `scripts/check.mjs` s'appliquent ici aussi.

Ariane confie la passe en trois missions, chacune avec un contexte neuf : **4a** l'étape 1 ci-dessous (en local), **4b** l'étape 2 (en ligne, par tranches), **4c** l'étape 3 à 5 (revue d'ensemble, rapport, verdict). Fais ta mission seulement, écris ta section dans le rapport, et rends `Statut : à reprendre` si une quarantaine d'échanges n'ont pas suffi.

C'est la seule validation complète du projet, et elle est **conséquente** : rien ne part en production sans elle. C'est aussi le seul moment où Thomas a le droit de prendre son temps et de passer des tests en ligne par tranches.

1. **Tout en local**, sur l'app construite pour la production : `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, puis **toute la suite de bout en bout, sur ordinateur et sur mobile** (`E2E_FULL=1 npm run test:e2e`). Aucune limite de Vercel ici : tout passe.
2. **En ligne**, sur la prévisualisation de la branche qui part en production : les parcours principaux de chaque fonctionnalité et toutes les démos de lots (`E2E_FULL=1 BASE_URL=<url> npm run test:e2e -- --grep @mobile`), sur les deux appareils. Ici, et ici seulement, les tranches sont permises. La méthode, éprouvée sur un vrai projet :
   - des **tranches de 20 à 30 tests** : `--shard=i/N` (`--workers=2` au plus). `--shard` ne découpe pas un fichier fait d'un seul bloc `serial` : découpe alors par `--project` ou par `--grep` ;
   - une **sonde avant chaque tranche**, avec un petit script Playwright (`goto /connexion`, statut 200), **pas avec `curl`** : `curl` repasse avant le navigateur ;
   - **deux minutes entre deux tranches** ;
   - un **seul pilote en tâche de fond** (une commande lancée avec `run_in_background`, qui enchaîne les tranches et écrit un journal). Pas de `nohup … &` : le journal n'apparaît pas, on relance par erreur et deux chaînes tournent en parallèle. `sleep` est bloqué dans l'environnement : attends avec `node -e "setTimeout(()=>{},120000)"` ;
   - un échec dû au point de contrôle (« Point de contrôle de sécurité » dans `error-context.md`) **n'est pas un défaut** : attends dix minutes une fois, relance la tranche, ne la compte pas comme un échec ;
   - **annonce la durée à Ariane** dès le départ, pour qu'elle prévienne l'utilisateur : sinon il croit à un blocage.
3. **La revue d'ensemble**, qui ne se fait qu'ici :
   - sécurité : règles d'accès de **toutes** les tables, aucune page privée ouverte sans session, aucun secret dans le code ni dans le navigateur, en-têtes de sécurité (CSP, X-Frame-Options, nosniff, Referrer-Policy) ;
   - données : une personne ne voit et ne modifie que ce qui est à elle ;
   - téléphone : installation de l'application sur l'écran d'accueil, lisibilité, zones tactiles ;
   - accessibilité de base : contrastes, navigation au clavier, titres ;
   - les risques acceptés « pour l'instant » pendant le projet (`decisions.md`) : liste à représenter à l'utilisateur avant la validation.
4. Rapport `docs/qa/release-<version>-rapport.md` : ce qui a été joué, ce qui passe, ce qui ne passe pas, les risques à représenter.
5. Verdict : **Prêt pour la production** ou **À corriger**. Un défaut bloquant retourne à Ada ; la passe reprend seulement sur ce qui a été touché, plus les parcours principaux.

Pour une version de **correctifs**, la passe est proportionnée : toute la suite en local, les parcours principaux en ligne, et la revue de sécurité sur ce qui a été touché seulement.

Budget : une heure et demie au plus. Si elle ne suffit pas, Thomas rend ce qu'il a, avec ce qui reste à jouer : c'est à l'utilisateur de décider.

---
name: testing
description: Stratégie de test d'Ariane (Vitest en local, Playwright sur l'environnement de test Vercel, captures, rapport). Savoir-faire de Thomas et d'Ada.
user-invocable: false
---

# Savoir-faire : les tests

## Deux temps

| Temps | Où | Quoi | Outil |
|---|---|---|---|
| 1 | En local | Tests unitaires (logique) et fonctionnels (composants, parcours dans un DOM simulé) | Vitest + Testing Library |
| 2 | En local pour la mise au point (story), puis sur l'environnement de test du lot (URL Vercel) | Tests de bout en bout dans un vrai navigateur, ordinateur et mobile | Playwright |

## Vitest

`vitest.config.ts` : environnement `jsdom`, plugin React, alias `@` vers `src`, fichier de setup qui importe `@testing-library/jest-dom/vitest`. Tests dans `tests/unit/` ou à côté du code (`*.test.ts(x)`).

Bonne pratique : tester ce que voit l'utilisateur (textes, rôles, libellés) plutôt que les détails internes.

## Playwright : rapide et borné

`playwright.config.ts` :

```ts
import { defineConfig, devices } from "@playwright/test";

const isRemote = Boolean(process.env.BASE_URL);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  timeout: 30_000, // un test qui dépasse 30 s est en échec, on n'attend pas
  expect: { timeout: 5_000 },
  retries: 1, // une seule nouvelle tentative, pour un test capricieux
  // On s'arrête tôt sur un lot ; la grande passe va au bout pour tout voir.
  maxFailures: process.env.E2E_FULL ? undefined : 5,
  // Dix minutes pour un lot ; une heure pour la grande passe d'avant mise en production.
  globalTimeout: (process.env.E2E_FULL ? 60 : 10) * 60_000,
  reporter: [["line"]], // une ligne par test, pas de pages de sortie
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    extraHTTPHeaders: process.env.VERCEL_BYPASS
      ? { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS }
      : undefined,
  },
  // En local, Playwright démarre l'app lui-même ; en ligne, il vise BASE_URL.
  webServer: isRemote
    ? undefined
    : { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // Le mobile ne rejoue que les parcours marqués @mobile (dont la démo du lot).
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
});
```

### Les limites extérieures : ce qui fait durer des heures

Relevé sur un vrai projet : la validation d'un lot en ligne a pris jusqu'à 2 h 25 pour environ 490 tests. Ce n'étaient pas les tests qui étaient lents, mais les attentes imposées par deux services :

- **Vercel** : après environ **40 tests navigateur** d'affilée sur une prévisualisation, Vercel affiche son « point de contrôle de sécurité » (réponse 403, en-tête `x-vercel-mitigated: challenge`) et bloque l'adresse 3 à 10 minutes. Passer des centaines de tests en ligne oblige à les découper en tranches de 20 avec des pauses : des heures.
- **Supabase** (projet de test) : 30 vérifications de lien et 30 connexions par tranche de 5 minutes et par adresse, 2 e-mails par heure avec l'envoi intégré. Une suite qui se connecte à chaque test ou qui attend des e-mails s'arrête toute seule.

Deux règles en découlent : **le gros des tests ne passe jamais en ligne**, et **une passe en ligne reste sous 40 tests navigateur**.

### Combien de tests

- **Le détail va dans Vitest**, qui est instantané : règles métier, cas limites, erreurs, fuseaux, droits.
- **De bout en bout, peu** : par story, **cinq tests au plus**, un par critère d'acceptation visible à l'écran, plus l'erreur principale. Pas un test par cas limite.
- **Sur mobile, encore moins** : seuls les tests marqués `@mobile` (le parcours principal de la story, le scénario de démo).
- Un fichier de bout en bout de quarante tests est un signal : ses cas limites doivent descendre dans Vitest.

### Qui écrit quoi, et où ça tourne

- **Ada écrit les tests de bout en bout de sa story** en même temps que le code, dans `tests/e2e/lot-NN/NNN-slug.spec.ts`. Elle pose des repères stables (`data-testid`, rôles, libellés) et met au point ses tests **en local**, où une relance prend quelques secondes.
- **Thomas ne met pas au point des tests contre l'environnement en ligne.** À la fin du lot, il écrit un seul test de plus : le scénario de démo, `tests/e2e/lot-NN/demo.spec.ts`, marqué `@mobile`, qui fait aussi les captures.

### Ce qu'on lance, où, et quand

| Moment | Où | Commande | Limite |
|---|---|---|---|
| Story (Ada, puis Thomas au temps 1) | En local | `npm run test:e2e -- --project=desktop tests/e2e/lot-NN/NNN-slug.spec.ts` | moins d'une minute |
| Fin de lot : les tests du lot | **En local**, sur l'app construite pour la production (`npm run build && npm start`, puis `BASE_URL=http://localhost:3000`) | `npm run test:e2e -- tests/e2e/lot-NN` | quelques minutes, aucune limite Vercel |
| Fin de lot : la démo | **En ligne**, sur la prévisualisation du lot | `BASE_URL=<url> npm run test:e2e -- tests/e2e/lot-NN/demo.spec.ts` | **moins de 40 tests navigateur**, une seule passe |
| Avant la mise en production : la grande passe | En local sur l'app construite, **puis en ligne** par tranches | voir « La grande passe d'avant mise en production » | une heure et demie au plus |

Sous PowerShell : `$env:BASE_URL="<url>"; npm run test:e2e -- tests/e2e/lot-NN/demo.spec.ts`. On ne rejoue **jamais** en ligne les tests des lots précédents, et pas davantage toute la suite : c'est ce qui a coûté des heures.

Si l'environnement de test est protégé par Vercel (page de connexion Vercel), voir le savoir-faire déploiement : Neil désactive la protection des prévisualisations ou fournit une clé de contournement (`VERCEL_BYPASS`). Cette clé ne lève pas le point de contrôle de sécurité : seule la sobriété l'évite.

### Le budget de la validation d'un lot

La validation d'un lot est **bornée**. Thomas ne s'acharne jamais :

1. **Une passe** des tests du lot en local, puis **une passe** de la démo en ligne.
2. Pour chaque test en échec, **une seule relance ciblée** (`npm run test:e2e -- <fichier> -g "<nom du test>"`), pas la suite entière.
3. S'il échoue encore : c'est un défaut, pas un test capricieux. Thomas **s'arrête** et rend « À corriger », avec pour chaque échec le test, ce qu'il attendait, ce qu'il a obtenu et la story concernée. Il ne corrige pas le code, ne réécrit pas le test pour le faire passer, et ne relance pas « pour voir ».
4. Si l'environnement ne répond pas, si le point de contrôle Vercel apparaît, ou si la même erreur touche tous les tests (connexion, variable manquante), il s'arrête **tout de suite** et rend « bloqué » : il n'attend pas, ne découpe pas en tranches, ne monte pas de script d'attente.
5. **Pas d'audit à chaque lot** : les contrôles se limitent à ce que le lot a ajouté (nouvelles tables et leurs règles d'accès, nouvelles pages, pas de secret). La revue d'ensemble se fait une fois, dans la grande passe d'avant mise en production (ci-dessous).
6. La démo est jouée **une fois** par appareil, avec **six captures au plus**.

En tout : vingt minutes au plus. Au-delà, il rend ce qu'il a.

### La grande passe d'avant mise en production

C'est la seule validation complète du projet, et elle est **conséquente** : rien ne part en production sans elle. C'est aussi le seul moment où Thomas a le droit de prendre son temps et de passer des tests en ligne par tranches.

1. **Tout en local**, sur l'app construite pour la production : `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, puis **toute la suite de bout en bout, sur ordinateur et sur mobile** (`E2E_FULL=1 npm run test:e2e`). Aucune limite de Vercel ici : tout passe.
2. **En ligne**, sur la prévisualisation de la branche qui part en production : les parcours principaux de chaque fonctionnalité et toutes les démos de lots (`E2E_FULL=1 BASE_URL=<url> npm run test:e2e -- --grep @mobile`), sur les deux appareils. Ici, et ici seulement, les tranches sont permises : au plus 30 tests navigateur par tranche, deux minutes entre deux tranches, un seul lancement en tâche de fond. Si le point de contrôle de Vercel apparaît malgré tout, une seule attente de dix minutes, puis reprise.
3. **La revue d'ensemble**, qui ne se fait qu'ici :
   - sécurité : règles d'accès de **toutes** les tables, aucune page privée ouverte sans session, aucun secret dans le code ni dans le navigateur, en-têtes de sécurité (CSP, X-Frame-Options, nosniff, Referrer-Policy) ;
   - données : une personne ne voit et ne modifie que ce qui est à elle ;
   - téléphone : installation de l'application sur l'écran d'accueil, lisibilité, zones tactiles ;
   - accessibilité de base : contrastes, navigation au clavier, titres ;
   - les risques acceptés « pour l'instant » pendant le projet (`decisions.md`) : liste à représenter à l'utilisateur avant la validation.
4. Rapport `docs/qa/release-<version>-rapport.md` : ce qui a été joué, ce qui passe, ce qui ne passe pas, les risques à représenter.
5. Verdict : **Prêt pour la production** ou **À corriger**. Un défaut bloquant retourne à Ada ; la passe reprend seulement sur ce qui a été touché, plus les parcours principaux.

Budget : une heure et demie au plus. Si elle ne suffit pas, Thomas rend ce qu'il a, avec ce qui reste à jouer : c'est à l'utilisateur de décider.

## Comptes et données de test

Les tests de bout en bout tournent sur le **Supabase de test**. Pour ne jamais buter sur ses limites :

- **Pas d'e-mail dans les tests.** Les comptes de test sont créés par l'API d'administration (`auth.admin.generateLink` ou `auth.admin.createUser` avec `email_confirm: true`, clé `service_role` lue dans `.env.local` par les tests seulement, jamais dans le code de l'app ni dans le navigateur) : aucun e-mail n'est envoyé, le compte est utilisable tout de suite.
- **Une session par suite, pas une connexion par test** : une fixture partagée ouvre la session une fois et la réutilise (`storageState`). Seuls les tests qui portent sur la connexion elle-même se connectent.
- **Des limites relevées sur le projet de test** : Neil monte les limites de débit de l'authentification du projet de test (voir le savoir-faire déploiement), pour qu'une suite complète passe sans attendre.
- Les tests créent leurs comptes `e2e+<horodatage>@example.com` et les suppriment à la fin ; chacun crée ses données et ne dépend pas de celles des autres. Aucune donnée réelle d'utilisateur.

## Captures

Les captures viennent du **test de démo** lui-même (`page.screenshot({ path })` aux écrans clés du scénario), six au plus, dans `docs/qa/captures/lot-NN/`. Pas de séance de captures à part. Elles servent à la démo d'Ariane et au wiki de Diderot.

## Rapport

`docs/qa/lot-NN-rapport.md`, à partir de `templates/docs/qa-report.md` : critères vérifiés (OK / KO), résultats, captures, verdict. Court : un tableau et une liste, pas de récit.

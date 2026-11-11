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
| 2 | Environnement de test de la branche (URL Vercel) | Tests de bout en bout dans un vrai navigateur, mobile et ordinateur | Playwright |

## Vitest

`vitest.config.ts` : environnement `jsdom`, plugin React, alias `@` vers `src`, fichier de setup qui importe `@testing-library/jest-dom/vitest`. Tests dans `tests/unit/` ou à côté du code (`*.test.ts(x)`).

Bonne pratique : tester ce que voit l'utilisateur (textes, rôles, libellés) plutôt que les détails internes.

## Playwright

`playwright.config.ts` :

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    screenshot: "only-on-failure",
    extraHTTPHeaders: process.env.VERCEL_BYPASS
      ? { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS }
      : undefined,
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
});
```

Lancer contre l'environnement de test : `BASE_URL=<preview_url> npm run test:e2e` (sous PowerShell : `$env:BASE_URL="<url>"; npm run test:e2e`).

Si l'environnement de test est protégé par Vercel (page de connexion Vercel), voir le savoir-faire déploiement : Neil désactive la protection des prévisualisations ou fournit une clé de contournement (`VERCEL_BYPASS`).

## Données de test

Les tests de bout en bout tournent sur le **Supabase de test**. Ils créent leurs propres données (par exemple un utilisateur `e2e+<horodatage>@example.com`) et ne dépendent pas de données existantes.

## Captures

Pour chaque story, captures des écrans clés, en mobile et en ordinateur, dans `docs/qa/captures/NNN/` (`page.screenshot({ path, fullPage: true })`). Elles servent à la démo d'Ariane et au wiki de Diderot.

## Rapport

`docs/qa/NNN-rapport.md`, à partir de `templates/docs/qa-report.md` : critères vérifiés (OK / KO), tests ajoutés, résultats, captures, verdict.

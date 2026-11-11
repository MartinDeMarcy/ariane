---
name: stack-nextjs-supabase
description: La stack imposée par Ariane (Next.js App Router, TypeScript, Tailwind, shadcn/ui, Supabase, PWA, Vitest, Playwright) et comment l'initialiser et l'utiliser. Savoir-faire de Gustave et d'Ada.
user-invocable: false
---

# Savoir-faire : la stack d'Ariane

## Les choix

| Couche | Choix |
|---|---|
| Framework | Next.js (App Router), TypeScript strict |
| Style | Tailwind CSS + shadcn/ui |
| Données, comptes, fichiers | Supabase (deux projets en ligne : test et production ; aucune base locale) |
| Accès Supabase | `@supabase/supabase-js` + `@supabase/ssr` |
| Mobile | PWA : manifeste Next.js (`app/manifest.ts`), icônes, service worker avec Serwist |
| Tests | Vitest + Testing Library (unitaires, fonctionnels), Playwright (bout en bout) |
| Hébergement | Vercel |

## Initialisation (Gustave)

À la racine du projet (qui contient déjà `docs/`, `.ariane/`, `CLAUDE.md`) :

```bash
npx create-next-app@latest app-tmp --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack
# déplace le contenu de app-tmp à la racine (sans écraser docs/, .ariane/, CLAUDE.md, .gitignore), puis supprime app-tmp
npm install @supabase/supabase-js @supabase/ssr
npx shadcn@latest init -d
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test
npx playwright install chromium
npm install @serwist/next && npm install -D serwist
```

Fusionne le `.gitignore` de Next.js avec celui d'Ariane (garde `.env*.local` et `!.env.example`).

Scripts `package.json` attendus :

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:e2e": "playwright test"
}
```

## Organisation du code

```
src/
├── app/                  # pages et routes (App Router)
│   ├── manifest.ts       # manifeste PWA
│   └── (auth)/…          # pages de connexion
├── components/           # composants d'interface (dont components/ui de shadcn)
├── lib/
│   ├── supabase/
│   │   ├── client.ts     # client navigateur (createBrowserClient)
│   │   └── server.ts     # client serveur (createServerClient + cookies)
│   └── database.types.ts # types générés depuis Supabase
└── features/<nom>/       # logique métier par fonctionnalité
supabase/
└── migrations/           # migrations SQL horodatées
tests/
├── unit/                 # Vitest
└── e2e/                  # Playwright
```

## Variables d'environnement

`.env.example` (versionné) liste les noms ; `.env.local` (jamais versionné) contient les valeurs du **Supabase de test** :

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

La clé `service_role` n'est jamais utilisée côté navigateur, ni committée.

## Base de données

- Toute évolution de schéma = un fichier SQL dans `supabase/migrations/` (`AAAAMMJJHHMMSS_description.sql`).
- **Chaque table a la Row Level Security activée** et des règles explicites (`create policy …`). Par défaut : un utilisateur ne lit et ne modifie que ses propres lignes (`auth.uid() = user_id`).
- Appliquer au Supabase de test (sans Docker) :
  ```bash
  npx supabase login
  npx supabase link --project-ref <ref-du-projet-test>
  npx supabase db push
  npx supabase gen types typescript --project-id <ref-du-projet-test> > src/lib/database.types.ts
  ```
- Le Supabase de production ne reçoit les migrations qu'à la mise en production (Neil).

## Authentification

Supabase Auth par e-mail (lien magique ou mot de passe, selon le PRD). Le middleware Next.js rafraîchit la session (`@supabase/ssr`). Les pages privées vérifient l'utilisateur côté serveur.

## PWA

- `src/app/manifest.ts` : nom, nom court, couleurs du thème (celles d'Iris), icônes 192 et 512 px, `display: "standalone"`.
- Service worker avec Serwist (`@serwist/next`) : mise en cache des ressources statiques ; pas de cache des données privées.
- L'installation sur téléphone nécessite le HTTPS : elle se teste sur l'environnement de test Vercel, pas en local.

## Qualité

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` doivent passer avant toute remise à Thomas.
- Composants accessibles : libellés de formulaire, contrastes, navigation au clavier.

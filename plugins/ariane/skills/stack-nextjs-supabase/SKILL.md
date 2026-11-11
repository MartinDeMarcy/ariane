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
| E-mails | `nodemailer` en SMTP, depuis le serveur uniquement |
| Tests | Vitest + Testing Library (unitaires, fonctionnels), Playwright (bout en bout) |
| Hébergement | Vercel |

## La version de Next.js : lis la doc installée, pas ta mémoire

`create-next-app@latest` installe la **dernière** version de Next.js (la 16 au moment de ces lignes, pas la 15). Elle a changé des habitudes :

- `middleware.ts` s'appelle **`src/proxy.ts`** (la fonction exportée aussi) ;
- **`next lint` n'existe plus** : le script `lint` est `eslint .` ;
- Turbopack est le compilateur par défaut ;
- **la documentation de la version installée est dans `node_modules/next/dist/docs/`** : lis-la avant d'utiliser une API de Next.js, au lieu de te fier à ce que tu en sais.

Vérifie aussi la version de **npm** (`npm --version`) : un npm trop ancien (9) bloque l'installation de `@vitejs/plugin-react` et de Vitest avec `@types/node@20`. Dans ce cas, installe `@types/node` en version récente (`^24`) et passe-toi de `@vitejs/plugin-react`, qui n'est pas indispensable pour tester.

## Initialisation (Gustave)

À la racine du projet (qui contient déjà `docs/`, `.ariane/`, `CLAUDE.md`) :

```bash
npx create-next-app@latest app-tmp --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
# déplace le contenu de app-tmp à la racine (sans écraser docs/, .ariane/, CLAUDE.md, .gitignore), puis supprime app-tmp
npm install @supabase/supabase-js @supabase/ssr nodemailer server-only
npx shadcn@latest init -d
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test @types/nodemailer
npx playwright install chromium
npm install @serwist/turbopack && npm install -D serwist esbuild
```

- Fusionne le `.gitignore` de Next.js avec celui d'Ariane (garde `.env*.local` et `!.env.example`).
- `create-next-app` crée aussi un **`AGENTS.md`** à la racine, que ni Ariane ni `CLAUDE.md` ne prévoient : relis-le, ne le laisse pas contredire `CLAUDE.md` (qui fait foi), et supprime-le s'il n'apporte rien.
- Ajoute un **`.gitattributes`** (`* text=auto eol=lf`) : sous Windows, Git réécrit sinon les fichiers en CRLF, ce qui fait échouer des remplacements de texte et fausse la comparaison de `supabase config push`.

Scripts `package.json` attendus :

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:e2e": "playwright test"
}
```

## Organisation du code

```
src/
├── proxy.ts              # ex-middleware : rafraîchit la session, protège les pages privées
├── app/                  # pages et routes (App Router)
│   ├── manifest.ts       # manifeste PWA
│   ├── serwist/[path]/route.ts  # service worker (Serwist, Turbopack)
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

La clé `service_role` n'est jamais utilisée côté navigateur, ni committée. Les variables d'e-mail (`SMTP_*`, `EMAIL_FROM`) et le secret de tâche planifiée (`CRON_SECRET`) vivent côté serveur seulement : voir la compétence déploiement. Les variables `NEXT_PUBLIC_*` sont **figées à la construction** du site.

## Base de données

- Toute évolution de schéma = un fichier SQL dans `supabase/migrations/` (`AAAAMMJJHHMMSS_description.sql`).
- **Chaque table a la Row Level Security activée** et des règles explicites (`create policy …`). Par défaut : un utilisateur ne lit et ne modifie que ses propres lignes (`auth.uid() = user_id`). Quand une règle donne un accès supplémentaire (par exemple à un responsable), les requêtes « pour tous » doivent **filtrer elles-mêmes** : la base ne le fait pas à leur place.
- Appliquer au Supabase de test (sans Docker). La CLI récente vise la **base locale** par défaut : ajoute `--remote` à `migration list` et `db query` (et `--read-only` pour une relecture sans risque d'écriture) :
  ```bash
  npx supabase login
  npx supabase link --project-ref <ref-du-projet-test>
  npx supabase db push
  npx supabase migration list --remote
  npx supabase gen types typescript --project-id <ref-du-projet-test> > src/lib/database.types.ts
  ```
- Le Supabase de production ne reçoit les migrations qu'à la mise en production (Neil), avec `--remote=<réf>` et sans changer le lien du dossier.

## Authentification

Supabase Auth par e-mail (lien magique ou mot de passe, selon le PRD). `src/proxy.ts` rafraîchit la session (`@supabase/ssr`). Les pages privées vérifient l'utilisateur côté serveur.

- **Liens d'e-mail** : avec les modèles par défaut de Supabase, le lien revient avec `?code=` et ne marche que dans le navigateur qui a demandé l'e-mail (PKCE). Écris des modèles dont le lien est de la forme `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…` (ou `{{ .RedirectTo }}` quand le site doit retomber sur l'adresse courante, utile avec les prévisualisations), traité par une route `/auth/confirm`.
- **Redirection ouverte** : toute route qui lit un paramètre de retour (`next`, `redirect`…) n'accepte **que des chemins internes** : une valeur qui commence par un seul `/` (jamais `//`, `/\` ni `://`). Écris un test pour chaque route concernée (c'est la faille la plus courante d'une inscription ou d'une connexion).
- **Cookie de session** : les réglages par défaut de `@supabase/ssr` (lisible par JavaScript, sans `Secure`, très longue durée) sont à revoir avant la mise en ligne : force `Secure` en HTTPS et une durée raisonnable ; sinon, note-le comme risque à présenter à l'utilisateur.
- **Anti-énumération** : une demande de mot de passe oublié répond le même message neutre, que l'adresse ait un compte ou non ; les erreurs de limite d'envoi ne tombent que sur un compte existant, ne les affiche donc pas telles quelles.
- **Identifiant mal encodé** : sur une page à identifiant (`/ressources/%ff`), Next 16 répond une erreur 500 en production. Refuse ces adresses par un 400 dans `proxy.ts`.

## PWA

- `src/app/manifest.ts` : nom, nom court, couleurs du thème (celles d'Iris), icônes 192 et 512 px, `display: "standalone"`.
- Service worker avec Serwist : **avec Next.js 16 (Turbopack), utilise `@serwist/turbopack`** (route `src/app/serwist/[path]/route.ts`), pas `@serwist/next`. `src/app/sw.ts` est exclu de `tsconfig.json` (conflit des types `dom` et `webworker`) et compilé par `esbuild`. Mise en cache des ressources statiques ; pas de cache des données privées ; une page `/hors-ligne`.
- L'installation sur téléphone nécessite le HTTPS : elle se teste sur l'environnement de test Vercel, pas en local.

## La coque mobile : la barre de navigation

Les défauts mobiles ne se voient pas dans les tests automatiques et font perdre des allers-retours aux démos. Dès la **première story** (la coque de l'application), mets en place :

- **`viewport-fit=cover`** : dans l'export `viewport` du layout racine (`viewportFit: "cover"`). Sans lui, les zones sûres (coins arrondis, encoche, barre de gestes) valent 0 et la barre est coupée sur les téléphones modernes.
- **Barre d'onglets fixe** : `fixed bottom-0 inset-x-0`, avec une colonne de page en **`min-h-dvh`** (jamais `sticky` + `min-h-screen`, qui bouge avec la barre d'adresse du téléphone). Un double invisible de même hauteur tient sa place dans le flux (la hauteur de la barre varie quand un libellé passe sur deux lignes).
- **Zones sûres** : `padding` avec `env(safe-area-inset-bottom)` et `env(safe-area-inset-left/right)`, avec un minimum de 16 px sur les côtés et 12 px en bas. Attention en paysage : la zone sûre latérale ne doit compter que si la barre touche réellement le bord.
- **`scroll-padding-bottom`** égal à la hauteur réelle de la barre (marge comprise) **dès la première story qui a un formulaire** : sinon un champ ou un bouton atteint au clavier passe sous la barre. Mesure-le (une barre de 121 px demande `8rem`, pas `7rem`) et ajoute un test.
- Cibles tactiles d'au moins 44 px.
- **Un essai sur un vrai téléphone à bords arrondis (via le QR code de la démo) reste indispensable** : l'émulation de Playwright ne le remplace pas.

## En-têtes de sécurité

Next.js et Vercel n'en posent presque aucun (Vercel ajoute seulement `Strict-Transport-Security`). **Pose-les dès la coque**, dans `next.config.ts` (`headers()`) : `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictive, et `poweredByHeader: false` (qui retire `X-Powered-By`). La **`Content-Security-Policy`** est plus délicate avec Next.js (scripts et styles intégrés, service worker) : commence par `Content-Security-Policy-Report-Only`, vérifie sur l'environnement de test que rien ne casse (dont l'installation de la PWA), puis passe en mode bloquant. Si une partie reste à faire, ajoute-la aux **risques à présenter** avant la mise en ligne.

## Tâches planifiées (Vercel Cron)

Pour un rappel ou un nettoyage récurrent : une route `GET` (par exemple `src/app/api/cron/<nom>/route.ts`) déclarée dans `vercel.json` (`crons`, heure en **UTC**).

- Vercel y envoie `Authorization: Bearer <CRON_SECRET>`. La route compare ce secret (comparaison à temps constant) et répond **401 sans corps ni détail** si l'en-tête manque ou est faux, **405** aux autres méthodes, avec `Cache-Control: no-store`. Elle est publique pour le proxy (pas de session), c'est ce secret qui la protège. Ses journaux ne contiennent jamais d'adresse e-mail.
- **Vercel ne lance la tâche qu'en production** : ailleurs, on l'appelle à la main avec le secret (jamais collé dans la conversation).
- **Fuseaux** : calcule « demain » dans le fuseau de l'équipe (réglage en base), pas en UTC. **Anti-doublon** : pose une marque avant l'envoi et relâche-la si l'envoi échoue ; deux appels simultanés ne doivent produire qu'un seul e-mail.
- `export const maxDuration` assez large pour envoyer les e-mails un par un.

## E-mails de l'application

- Envoi **côté serveur uniquement** (`import "server-only"`), par `nodemailer` en SMTP, avec des délais courts (un serveur de messagerie muet ne doit pas retenir la fonction).
- **L'envoi ne bloque jamais l'action de l'utilisateur** : une réservation, une annulation reste valable si l'e-mail échoue ; l'erreur est journalisée sans adresse. Pour répondre vite, envoie après la réponse (`after()` de `next/server`) et vérifie que cela tient avec `redirect()`.
- **Sans configuration SMTP**, l'application marche mais n'envoie rien **et n'annonce aucun e-mail** à l'écran.
- Le mode « à blanc » des tests (`EMAIL_DRY_RUN`) est ignoré en production Vercel et ne doit exister dans aucun environnement Vercel.
- Ne montre jamais l'adresse e-mail d'une autre personne à un utilisateur (ni dans la page, ni dans le HTML brut).

## Qualité

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` doivent passer avant toute remise à Thomas.
- Composants accessibles : libellés de formulaire, contrastes, navigation au clavier, régions nommées.
- Quand tu ajoutes une promesse d'e-mail à un écran, cherche `/e-mail/` dans `tests/e2e` : des tests plus anciens peuvent refuser ce mot.

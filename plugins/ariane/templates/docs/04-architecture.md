# Architecture : {{nom du projet}}

> Rédigée par Gustave le {{date}}.

## En bref

Trois à cinq phrases simples : comment l'app est construite et pourquoi.

## Stack

Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui, Supabase, PWA (Serwist), Vitest, Playwright, Vercel. Bibliothèques ajoutées :

| Bibliothèque | Pourquoi |
|---|---|

## Modèle de données

### Table `{{nom}}`

| Champ | Type | Rôle |
|---|---|---|

**Règles d'accès (RLS)** : qui peut lire, créer, modifier, supprimer.

## Organisation du code

Où se trouvent les pages, les composants, la logique métier, l'accès aux données.

## Environnements

| Environnement | Où | Supabase |
|---|---|---|
| Local | ordinateur | test |
| Test | prévisualisation Vercel par branche | test |
| Production | Vercel, depuis `release/x.y.z` | production |

## Variables d'environnement

Noms uniquement (valeurs dans `.env.local` et dans Vercel).

## Décisions et compromis

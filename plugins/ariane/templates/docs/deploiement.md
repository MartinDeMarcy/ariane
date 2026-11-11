# Déploiement : {{nom du projet}}

> Tenu par Neil.

## Environnements

| Environnement | URL | Supabase |
|---|---|---|
| Test | prévisualisation Vercel de chaque branche | {{projet test}} |
| Production | {{url publique}} | {{projet production}} |

## Variables

| Nom | Où la trouver | Local | Preview | Production |
|---|---|---|---|---|

## Mettre en production

1. Validation 4 par l'utilisateur.
2. Clio crée `release/x.y.z` et l'étiquette `vx.y.z`.
3. Sauvegarde de la base de production.
4. Migrations sur le Supabase de production.
5. `npx vercel deploy --prod` depuis la branche de release.
6. Vérification de l'URL publique.

## Revenir en arrière

`npx vercel rollback`, puis analyse.

## Historique des mises en production

| Version | Date | Remarques |
|---|---|---|

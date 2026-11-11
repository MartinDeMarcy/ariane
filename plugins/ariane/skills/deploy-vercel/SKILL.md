---
name: deploy-vercel
description: Mise en place des environnements d'Ariane (Supabase test et production, Vercel), environnement de test par branche et mise en production depuis une branche de release. Savoir-faire de Neil.
user-invocable: false
---

# Savoir-faire : environnements et déploiement

## Les trois environnements

| Environnement | Où | Base Supabase |
|---|---|---|
| Local | Ordinateur de l'utilisateur (`npm run dev`) | Projet **test** (via `.env.local`) |
| Test | Prévisualisation Vercel automatique de chaque branche poussée | Projet **test** |
| Production | Déploiement Vercel de production, depuis une branche `release/x.y.z` | Projet **production** |

## Mise en place (une fois, avec l'utilisateur)

L'utilisateur fait lui-même les actions qui demandent un compte ; guide-le une étape à la fois.

1. **Supabase** (offre gratuite) : créer deux projets, `<nom>-test` et `<nom>-prod`, dans la même région (Europe pour un public européen). Pour chacun, l'utilisateur garde le mot de passe de la base dans son gestionnaire de mots de passe. Note les références de projet dans `state.environments` (pas les clés).
   - Bon à savoir : en offre gratuite, un projet inactif peut être mis en pause ; il se réactive depuis le tableau de bord.
2. **Clés locales** : l'utilisateur copie l'URL et la clé `anon` du projet **test** (Project Settings → API) dans `.env.local`.
3. **Vercel** (offre gratuite, Hobby) : l'utilisateur se connecte avec son compte GitHub et importe le dépôt (Add New → Project). Framework : Next.js.
4. **Variables Vercel** (Settings → Environment Variables) :
   - environnement **Preview** : URL et clé `anon` du Supabase **test** ;
   - environnement **Production** : URL et clé `anon` du Supabase **production**.
5. **Protection des prévisualisations** : par défaut, Vercel peut demander une connexion pour ouvrir une prévisualisation. Pour que l'utilisateur ouvre la démo sur son téléphone et que Thomas la teste, désactive la protection des déploiements de prévisualisation (Settings → Deployment Protection), ou génère une clé de contournement pour l'automatisation et donne-la à Thomas via la variable `VERCEL_BYPASS` (jamais committée).
6. **Pas de production automatique depuis `main`** : ajoute `vercel.json` à la racine :
   ```json
   {
     "git": {
       "deploymentEnabled": {
         "main": false
       }
     }
   }
   ```
   Les branches `feature/*` et `lot/*` restent déployées en prévisualisation ; la production ne part que depuis une release, à la main.
7. **Auth Supabase** : dans chaque projet Supabase (Authentication → URL Configuration), ajoute les URL autorisées : `http://localhost:3000`, le motif des prévisualisations Vercel (projet test) et l'URL de production (projet production).

## L'environnement de test d'une branche

Après le push de Clio, Vercel déploie la branche et publie le résultat sur GitHub. Récupère l'URL :

```bash
gh api "repos/<owner>/<repo>/deployments?ref=<branche>&per_page=1" --jq '.[0].id'
gh api "repos/<owner>/<repo>/deployments/<id>/statuses" --jq '.[0].environment_url'
```

Attends que le statut soit `success` (réessaie toutes les 30 secondes, cinq minutes au plus). Vérifie que l'URL répond (code 200), puis note-la dans `stories[].preview_url` (branche d'une story) ou `lots[].preview_url` (branche `lot/NN-slug`).

## Mise en production (après la validation 4 et la release de Clio)

1. **Sauvegarde** de la base de production avant toute migration : `npx supabase db dump --linked -f backups/prod-<date>.sql` (projet production lié). Si la commande n'est pas disponible sur la machine, demande à l'utilisateur de faire une sauvegarde depuis le tableau de bord Supabase et attends sa confirmation. Le dossier `backups/` n'est jamais versionné.
2. **Migrations** sur le Supabase de production :
   ```bash
   npx supabase link --project-ref <ref-du-projet-prod>
   npx supabase db push
   npx supabase link --project-ref <ref-du-projet-test>   # revenir au projet de test
   ```
3. **Déploiement** de la release :
   ```bash
   git switch release/x.y.z
   npx vercel login            # la première fois
   npx vercel link             # la première fois
   npx vercel deploy --prod
   git switch main
   ```
4. **Vérification** : l'URL de production répond, la connexion fonctionne, la PWA s'installe. Note l'URL dans `environments.production_url`.
5. **En cas de problème** : `npx vercel rollback` (retour au déploiement précédent), puis explique la situation à Ariane.
6. Mets à jour `docs/deploiement.md` (modèle `templates/docs/deploiement.md`).

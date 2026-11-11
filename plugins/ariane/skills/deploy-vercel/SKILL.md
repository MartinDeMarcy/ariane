---
name: deploy-vercel
description: Mise en place des environnements d'Ariane (Supabase test et production, Vercel, e-mails), environnement de test par branche et mise en production depuis une branche de release. Savoir-faire de Neil.
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

L'utilisateur fait lui-même les actions qui demandent un compte ; guide-le une étape à la fois. **L'ordre compte** : Supabase de test d'abord, puis le socle du projet envoyé sur GitHub par Clio, et seulement ensuite Vercel (il importe un dépôt qui contient déjà le code).

1. **Supabase** (offre gratuite).
   - **Avant de créer quoi que ce soit, compte les projets actifs de l'utilisateur** (`npx supabase projects list`, ou son tableau de bord). **L'offre gratuite n'autorise que 2 projets actifs par personne**, tous projets confondus (y compris ceux d'autres applications). Si la place manque pour `<nom>-test` ou `<nom>-prod` : explique-le simplement et propose à l'utilisateur de **mettre en pause un autre de ses projets** (réversible, depuis le tableau de bord) ou de passer en Pro. **Ne mets jamais en pause ni ne supprime un projet de l'utilisateur à sa place.** La création de `<nom>-prod` se fait souvent à la mise en production, pas au début : préviens-le à l'avance.
   - Créer deux projets, `<nom>-test` et `<nom>-prod`, dans la même région (Europe pour un public européen). Pour chacun, l'utilisateur garde le mot de passe de la base dans son gestionnaire de mots de passe. Note les références de projet dans `state.environments` (pas les clés).
   - Bon à savoir : en offre gratuite, un projet inactif peut être mis en pause ; il se réactive depuis le tableau de bord.
2. **Clés locales** : l'utilisateur copie l'URL et la clé `anon` du projet **test** (Project Settings → API) dans `.env.local`. Vérifie leur présence **sans les afficher** (par exemple un script qui n'imprime que « renseignée / absente »).
3. **Vercel** (offre gratuite, Hobby) : après la fusion du socle dans `main`, l'utilisateur se connecte avec son compte GitHub et importe le dépôt (Add New → Project). Framework : Next.js. Décris l'emplacement des menus avec des repères visuels (ou demande une capture d'écran) : c'est l'étape où l'on se perd le plus. **L'import déclenche toujours un premier déploiement de production**, même si `vercel.json` interdit ensuite `main` : ne t'en inquiète pas, mais il existera alors un déploiement de production « de socle » avant la première vraie mise en ligne.
4. **Variables Vercel** (Settings → Environment Variables) :
   - environnement **Preview** : URL et clé `anon` du Supabase **test**, `SUPABASE_SERVICE_ROLE_KEY` du test si le projet l'utilise, variables d'e-mail du test (voir « Les e-mails ») ;
   - environnement **Production** : les mêmes noms, avec les valeurs du Supabase **production**. **Ne réutilise jamais les clés du projet de test en production.**
   - Chaque variable doit cocher le bon environnement (une variable limitée à « Production » n'existe pas en prévisualisation). **Après un ajout, un nouveau déploiement est nécessaire** : les variables `NEXT_PUBLIC_*` sont figées au moment de la construction du site.
   - L'utilisateur colle lui-même les valeurs secrètes. Tu ne vérifies que les **noms** (tu ne les lis pas, et la CLI Vercel n'est souvent pas connectée : dis alors que la présence « n'est pas vérifiable » au lieu de la supposer).
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
7. **Limites du projet de test** : dans le projet Supabase **de test seulement**, monte les limites de débit de l'authentification (`supabase/config.toml`, section `[auth.rate_limit]` : `token_verifications` et `sign_in_sign_ups` à 300 au lieu de 30, puis `config push` ; ou Authentication → Rate Limits dans le tableau de bord). Sans cela, une suite de tests attend cinq minutes toutes les trente connexions. Ne le fais jamais sur le projet de production. Les tests créent leurs comptes par l'API d'administration, sans e-mail (voir le savoir-faire des tests).
8. **Auth Supabase** : dans chaque projet Supabase, règle l'adresse du site (`site_url`) et les URL autorisées : `http://localhost:3000` et le motif des prévisualisations Vercel (projet test), l'adresse publique seule (projet production). Dans la mesure du possible, écris ces réglages **en code** (`supabase/config.toml`, poussés par `npx supabase config push`) plutôt qu'à la main dans le tableau de bord.
   - Jokers des URL autorisées : `*` = une suite de caractères sans `.` ni `/`, `**` = n'importe quelle suite.
   - Vercel **tronque** les noms de branche longs dans l'adresse stable (suffixe de hachage) : vérifie que le motif des redirections couvre bien l'adresse réelle d'une prévisualisation.

## Les e-mails (comptes et rappels)

Sans réglage, Supabase envoie les e-mails de compte avec son service intégré, **très limité** (de l'ordre de 2 e-mails par heure, uniquement vers les membres de l'équipe du projet) : suffisant pour essayer seul, pas pour inviter du monde. Et **les modèles d'e-mails personnalisés sont refusés sans SMTP personnalisé** : `config push` échoue (erreur 400) si `config.toml` déclare des modèles sans bloc `[auth.email.smtp]`. Tant que le SMTP n'est pas réglé, laisse les modèles commentés.

Deux options. **Le choix revient à l'utilisateur, avec ta recommandation, et il est noté dans `decisions.md`** (voir « Garder les décisions à jour » dans `ariane.md`) :

| | Resend (recommandé pour la production) | Gmail (possible, plutôt pour un essai) |
|---|---|---|
| Ce qu'il faut | Un compte Resend et un **nom de domaine** vérifié (DNS : il se règle chez le fournisseur du domaine, souvent payant) | Un compte Gmail, validation en deux étapes, **mot de passe d'application** |
| `SMTP_HOST` / `SMTP_PORT` | `smtp.resend.com` / `465` | `smtp.gmail.com` / `465` |
| `SMTP_USER` | `resend` (ce n'est **pas** une adresse) | l'adresse Gmail qui envoie |
| `SMTP_PASSWORD` | clé API Resend (secrète) | mot de passe d'application (**secret : il donne accès à toute la boîte Gmail**, révocable à tout moment) |
| `EMAIL_FROM` | `Nom <adresse@domaine-vérifié>` (obligatoire) | l'adresse doit être celle de `SMTP_USER` (Gmail refuse un autre expéditeur) |
| Limites | selon l'offre Resend (à vérifier et à noter) | environ 500 messages par jour |
| À savoir | | l'adresse personnelle de l'utilisateur est visible des destinataires : recommande un **compte Gmail dédié** |

- **Dans `config.toml`**, `[auth.email.smtp]` lit `host`, `user` et `pass` dans l'environnement (`env(SMTP_HOST)`…) : aucune valeur secrète dans le dépôt. Avec Resend, `admin_email` ne peut pas valoir `env(SMTP_USER)` (ce serait « resend ») : écris l'adresse d'expédition en dur dans la copie de production.
- **Limite horaire** : `[auth.rate_limit] email_sent` vaut 2 par défaut dans le fichier, ce qui bloque des inscriptions à la suite : règle-la (30, par exemple) une fois le SMTP personnalisé actif.
- **Pousser la configuration** sans jamais lire ni afficher `.env.local` : `node --env-file=.env.local <script qui lance « npx supabase config push » et répond y>`, sortie masquée. Relancer ensuite : « Remote Auth config is up to date » prouve que c'est appliqué. Le mot de passe SMTP apparaît toujours « differs » (Supabase ne le relit pas) : c'est normal.
- **Fins de ligne** : sous Windows, Git réécrit les fichiers en CRLF et `config push` annonce « differs » pour les modèles d'e-mails (le dépôt et Supabase sont en LF). Le projet doit contenir un `.gitattributes` (`* text=auto eol=lf`, à faire ajouter par Clio s'il manque) ; sans lui, normalise les fins de ligne avant de pousser (copie en LF, jamais le dossier en CRLF).
- **`EMAIL_DRY_RUN`** (mode « à blanc » des tests) ne doit exister dans **aucun** environnement Vercel : s'il valait `1`, l'écran annoncerait des e-mails qui ne partent pas. À vérifier à la main avant chaque mise en production.
- **Envoi réel de contrôle** : n'envoie un e-mail réel qu'avec l'accord explicite de l'utilisateur, à sa propre adresse.

## L'environnement de test d'une branche

Après le push de Clio, Vercel déploie la branche et publie le résultat sur GitHub. **Vercel référence ses déploiements par commit (SHA), pas par nom de branche** : l'API filtrée par `?ref=<branche>` renvoie une liste vide. Récupère l'URL ainsi :

```bash
SHA=$(git rev-parse <branche>)
gh api "repos/<owner>/<repo>/deployments?per_page=30" --jq ".[] | select(.sha==\"$SHA\") | .id" | head -1
gh api "repos/<owner>/<repo>/deployments/<id>/statuses" --jq '.[0] | {state, environment_url}'
```

Autres sources : le commentaire Vercel de la pull request, ou l'adresse stable `https://<projet>-git-<branche-avec-tirets>-<équipe>.vercel.app` (Vercel la tronque pour les noms longs : ne te fie pas à l'adresse « attendue »).

Attends que le statut soit `success` (réessaie toutes les 30 secondes, cinq minutes au plus). Vérifie que l'URL répond (code 200), puis note-la dans `stories[].preview_url` (branche d'une story) ou `lots[].preview_url` (branche `lot/NN-slug`). Contrôle aussi, en lecture seule : les migrations sont identiques en local et sur le projet de test (`npx supabase migration list --remote`), la sécurité des tables est active (RLS), les pages privées renvoient 307 vers la connexion.

## Mise en production (après la validation 4 et la release de Clio)

Avant de commencer, relis `decisions.md` (fournisseur d'e-mails, domaine, risques acceptés) : si ce que tu vas mettre en place diffère d'une décision, **dis-le dans ton compte rendu** au lieu de le faire en silence.

1. **Sauvegarde** de la base de production avant toute migration (base vide au départ : note-le). Si `npx supabase db dump` n'est pas disponible, demande à l'utilisateur de faire une sauvegarde depuis le tableau de bord Supabase et attends sa confirmation. Le dossier `backups/` n'est jamais versionné. La sauvegarde automatique de Supabase dépend de l'offre : note ce qu'il en est.
2. **Créer le projet de production** s'il n'existe pas encore (voir la limite des 2 projets gratuits plus haut). Le mot de passe de la base généré va dans un fichier **hors dépôt** et n'est jamais affiché.
3. **Migrations** : **avec `--remote=<ref-du-projet-prod>`, sans `supabase link`** : le dossier du dépôt reste lié au projet de test, donc aucune commande ne risque de viser la production par erreur.
   ```bash
   npx supabase db push --remote=<ref-prod> --dry-run   # liste ce qui sera appliqué
   npx supabase db push --remote=<ref-prod>
   npx supabase db query --remote=<ref-prod> --read-only "<requête de relecture>"
   ```
   Les migrations passent **avant le code qui les utilise**. Relis ensuite, en lecture seule, ce qui compte : tables et Row Level Security, politiques, fonctions et leurs droits d'exécution, déclencheurs, réglages, historique des migrations, base vide. Compare au projet de test.
4. **Configuration d'authentification de production** : pousse-la depuis **une copie de `supabase/` hors dépôt** (avec le `site_url` de production et les seules redirections de production), jamais depuis le dossier du dépôt, réglé pour le test :
   ```bash
   npx supabase config diff --workdir <copie> --remote=<ref-prod>    # lecture seule d'abord
   npx supabase config push --workdir <copie> --remote=<ref-prod>
   ```
   Après le push, il reste toujours des différences sur `db.pooler.*` et `storage.vector.*` (non poussables) : c'est normal. Le premier `config diff` qui suit un push peut encore montrer l'ancien état quelques secondes : relance-le. Contrôle que la configuration du projet de test n'a pas bougé.
5. **Variables Vercel « Production »** : posées par l'utilisateur (voir plus haut). Rappelle-lui les noms, jamais les valeurs. `CRON_SECRET` y est indispensable si le projet a une tâche planifiée.
6. **Déploiement** de la release. **Ne « promeus » ni ne « redéploie » jamais une prévisualisation de la branche de release** : elle a été construite avec les variables Preview (Supabase de **test**) et les `NEXT_PUBLIC_*` sont figées au build. Il faut une construction neuve, avec les variables Production :
   ```bash
   git switch release/x.y.z
   npx vercel deploy --prod
   git switch main
   ```
   - **Cette commande est refusée par les permissions de Claude Code** (« Production Deploy ») : ne la contourne pas. Donne à l'utilisateur la commande exacte, dans un bloc de code, et demande-lui de la lancer dans son terminal (ou d'autoriser cette action pour Neil). Reprends la suite une fois qu'il t'a dit que c'est fait.
   - **`npx vercel login` / `npx vercel link`** (la première fois) : `link` modifie des fichiers sans le dire : il ajoute `.vercel` et `.env*` à `.gitignore` (fichier versionné : remets-le tel quel) et écrit `VERCEL_OIDC_TOKEN` dans `.env.local` (inoffensif, mais ne touche pas aux autres variables). Le dossier `.vercel` ne doit jamais être versionné.
7. **Vérification** de l'URL publique, en lecture seule (aucun compte créé, aucun e-mail envoyé) : la page de connexion répond ; les pages privées renvoient 307 vers la connexion ; `/inscription` et le manifeste répondent ; le service worker et la page hors ligne répondent ; `http://` redirige vers `https://` ; l'en-tête HSTS est présent ; une route protégée par secret (cron) répond 401 à corps vide sans en-tête, 405 aux autres méthodes ; aucun `Set-Cookie` pour un visiteur anonyme. Relève les **en-têtes de sécurité absents** (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) et signale-les à Ariane (elle les re-présente à l'utilisateur ; voir la compétence stack). Le site n'embarque en général aucune adresse Supabase côté client : **la base réellement branchée ne se prouve pas de l'extérieur**. Preuve prévue : après le premier essai réel de l'utilisateur (inscription), relis en lecture seule la base de production (le nombre de profils passe de 0 à 1) et vérifie que celle de test n'a pas bougé. Ne tire pas les variables de production sur le disque pour le vérifier.
8. **Alias et déploiements** : le CLI affiche « production » pour tout projet visé par `--remote`, même le test : **vérifie toujours la référence dans la ligne « Target: »**. `npx vercel inspect <url>` (section Aliases) confirme l'adresse publique ; `npx vercel ls --prod` liste les déploiements de production. Un ancien déploiement de production (celui de l'import initial) peut exister : l'API des déploiements GitHub ne le montre pas forcément.
9. **Tâche planifiée** (Vercel Cron) : elle ne tourne qu'en production, la première fois à son heure prévue (en UTC). Dis à Ariane quand la vérifier (Vercel → Logs) : c'est un point « à confirmer », pas « fait ».
10. **En cas de problème** : `npx vercel rollback` (retour au déploiement précédent), puis explique la situation à Ariane. S'il n'y a pas d'état précédent sain (seul ancien déploiement : celui du socle), dis-le : il n'y a alors pas de retour possible.
11. Note l'URL dans `environments.production_url`, et mets à jour `docs/deploiement.md` (modèle `templates/docs/deploiement.md`).

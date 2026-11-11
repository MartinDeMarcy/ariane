# Le fichier d'état `.ariane/state.json`

C'est la mémoire du projet. Ariane le lit au début de chaque session et le met à jour après chaque étape. Le modèle de départ est `templates/state.json`.

## Champs

| Champ | Type | Rôle |
|---|---|---|
| `ariane` | texte | Version d'Ariane qui a créé le projet |
| `project.name` | texte | Nom du projet (aussi nom du dépôt, en minuscules avec tirets) |
| `project.pitch` | texte | L'idée en une phrase |
| `project.language` | texte | Langue de l'utilisateur (`fr` par défaut) |
| `user.os` | `windows` · `macos` · `linux` | Système de l'utilisateur (détecté puis confirmé) |
| `user.terminal` | `none` · `guided` · `comfortable` | Familiarité avec le terminal (PowerShell, Terminal) |
| `user.git` | `none` · `basic` · `regular` | Familiarité avec Git et GitHub |
| `user.github_account` | booléen | A-t-il déjà un compte GitHub ? |
| `user.coding` | `none` · `some` · `regular` | A-t-il déjà écrit du code ? |
| `user.learning` | `explain` · `essential` | Préfère comprendre le pourquoi, ou aller à l'essentiel |
| `user.profile` | `newcomer` · `intermediate` · `developer` · `null` | Cible d'Ariane, déduite des réponses du début et ajustée en cours de route (voir `user-profile.md`) |
| `user.detail` | `simple` · `normal` · `detailed` · `null` | Niveau de détail technique de la conversation (voir `communication.md`) ; `simple` par défaut |
| `maturity.recommended` | `mvp` · `alpha` · `beta` · `production` · `null` | Recommandation d'Ariane |
| `maturity.target` | idem | Niveau confirmé par l'utilisateur |
| `maturity.answers` | objet | Réponses aux trois questions |
| `phase` | texte | Phase en cours (voir `workflow.md`), ou `stopped` / `done` |
| `phases.<phase>` | `todo` · `in_progress` · `waiting_validation` · `done` | Avancement de chaque phase |
| `challenge.brief.status` / `challenge.prd.status` | `null` · `done` · `skipped` | La contradiction par Cassandre a-t-elle eu lieu, sur l'idée (phase 2) et sur le PRD (phase 3) ? Voir `workflow.md` |
| `challenge.<moment>.rounds` / `.raised` | nombre | Nombre de tours de débat (un seul) et de questions remontées à l'utilisateur |
| `challenge.<moment>.at` | date ISO ou `null` | Date de la contradiction |
| `gates.prd` / `gates.ux` / `gates.release` | date ISO ou `null` | Date de chaque validation |
| `lots[]` | liste | Une entrée par lot de stories (voir ci-dessous) |
| `current_lot` | texte ou `null` | Identifiant du lot en cours |
| `stories[]` | liste | Une entrée par story (voir ci-dessous) |
| `current_story` | texte ou `null` | Identifiant de la story en cours |
| `repo.url` | texte | URL du dépôt GitHub |
| `repo.default_branch` | texte | `main` |
| `environments.supabase_test` | texte | Référence du projet Supabase de test |
| `environments.supabase_prod` | texte | Référence du projet Supabase de production |
| `environments.vercel_project` | texte | Nom du projet Vercel |
| `environments.production_url` | texte | URL publique, après la première mise en production |
| `wiki.status` | `null` · `published` · `needs_first_page` · `unavailable` · `declined` | Publication du wiki sur GitHub (voir `ariane.md`) ; `unavailable` quand GitHub ne le propose pas à ce compte, `declined` quand l'utilisateur ne veut pas créer la première page |
| `wiki.url` | texte ou `null` | Adresse du wiki GitHub, une fois publié |
| `wiki.published_at` | date ISO ou `null` | Dernière publication |
| `releases[]` | liste | `{ "version", "date", "tag" }` |
| `cycle` | objet ou `null` | La version en cours après le MVP : `version`, `type` (`patch` · `minor` · `major`), `goal`, `status`, `started_at`, `from`, `items[]`, `lots[]`, `urgent` (voir `versions.md`) ; `null` hors d'une version |
| `counters.lot` / `counters.story` | nombre | Dernier numéro de lot et de story utilisé : la numérotation continue d'une version à l'autre |
| `phases.ideation` | comme les autres phases | La préparation d'une version ; n'existe qu'après le MVP |
| `feedback.enabled` | booléen | L'utilisateur accepte-t-il le journal de retours d'expérience ? |
| `feedback.asked_at` | date ISO ou `null` | Date à laquelle la question a été posée |
| `history[]` | liste | `{ "date", "agent", "event" }`, une ligne par étape ; seules les 20 dernières restent ici, les plus anciennes sont rangées dans `.ariane/history/` à la fin de chaque lot |

Projets en version 0.13.0 : `challenge.status`, `rounds`, `raised` et `at` étaient alors à plat ; lis-les comme `challenge.brief`, et crée `challenge.prd` vide.

## Une story

```json
{
  "id": "001",
  "slug": "inscription",
  "title": "S'inscrire avec son e-mail",
  "lot": "01",
  "status": "todo",
  "branch": "feature/001-inscription",
  "preview_url": null,
  "pull_request": null,
  "validated_at": null,
  "notes": []
}
```

Statuts, dans l'ordre : `todo` → `in_progress` → `local_ok` → `in_lot` → `done`. Le statut `on_test` (story testée seule sur son environnement) n'est plus utilisé depuis la 0.18.0, où les tests en ligne se font une fois par lot ; il reste lu pour les projets plus anciens.

- `in_lot` : story terminée, testée en local et fusionnée dans la branche du lot ; elle attend les tests en ligne et la démo du lot.
- `done` : le lot a été validé et fusionné dans `main`.
- Aucune démo n'a lieu au niveau d'une story : les remarques de l'utilisateur donnent de nouvelles stories dans le même lot.

## Un lot

```json
{
  "id": "01",
  "slug": "socle-et-inscription",
  "title": "Socle et inscription",
  "goal": "Pouvoir créer un compte et se connecter",
  "stories": ["001", "002"],
  "demo": ["Ouvrir le lien de test", "Créer un compte", "Se déconnecter puis se reconnecter"],
  "status": "todo",
  "branch": "lot/01-socle-et-inscription",
  "preview_url": null,
  "pull_request": null,
  "validated_at": null,
  "notes": []
}
```

Statuts, dans l'ordre : `todo` → `in_progress` → `demo` → `done`. Un lot refusé à la démo repasse à `in_progress`, avec les remarques dans `notes` et de nouvelles stories de correction. Un lot qui s'arrête sur un blocage reste `in_progress`, avec la raison dans `notes`.

Projets créés avant les lots : si `lots` est vide alors que des stories existent, Ariane crée un lot par story non terminée (`lots[].stories` = une seule story) avant de continuer.

## Règles

- Jamais de secret dans ce fichier (clés, mots de passe) : seulement des noms et des références.
- Écrire du JSON valide, indenté de deux espaces.
- Ce fichier est versionné avec le projet.

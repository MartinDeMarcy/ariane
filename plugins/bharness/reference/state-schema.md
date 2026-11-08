# Le fichier d'état `.bharness/state.json`

C'est la mémoire du projet. Ariane le lit au début de chaque session et le met à jour après chaque étape. Le modèle de départ est `templates/state.json`.

## Champs

| Champ | Type | Rôle |
|---|---|---|
| `bharness` | texte | Version de Bharness qui a créé le projet |
| `project.name` | texte | Nom du projet (aussi nom du dépôt, en minuscules avec tirets) |
| `project.pitch` | texte | L'idée en une phrase |
| `project.language` | texte | Langue de l'utilisateur (`fr` par défaut) |
| `user.os` | `windows` · `macos` · `linux` | Système de l'utilisateur (détecté puis confirmé) |
| `user.terminal` | `none` · `guided` · `comfortable` | Familiarité avec le terminal (PowerShell, Terminal) |
| `user.git` | `none` · `basic` · `regular` | Familiarité avec Git et GitHub |
| `user.github_account` | booléen | A-t-il déjà un compte GitHub ? |
| `user.coding` | `none` · `some` · `regular` | A-t-il déjà écrit du code ? |
| `user.learning` | `explain` · `essential` | Préfère comprendre le pourquoi, ou aller à l'essentiel |
| `user.detail` | `simple` · `normal` · `detailed` · `null` | Niveau de détail technique de la conversation (voir `communication.md`) ; `simple` par défaut |
| `maturity.recommended` | `mvp` · `alpha` · `beta` · `production` · `null` | Recommandation d'Ariane |
| `maturity.target` | idem | Niveau confirmé par l'utilisateur |
| `maturity.answers` | objet | Réponses aux trois questions |
| `phase` | texte | Phase en cours (voir `workflow.md`), ou `stopped` / `done` |
| `phases.<phase>` | `todo` · `in_progress` · `waiting_validation` · `done` | Avancement de chaque phase |
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
| `feedback.enabled` | booléen | L'utilisateur accepte-t-il le journal de retours d'expérience ? |
| `feedback.asked_at` | date ISO ou `null` | Date à laquelle la question a été posée |
| `history[]` | liste | `{ "date", "agent", "event" }`, une ligne par étape |

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

Statuts, dans l'ordre : `todo` → `in_progress` → `local_ok` → `on_test` → `in_lot` → `done`.

- `in_lot` : story terminée, testée sur son environnement et fusionnée dans la branche du lot ; elle attend la démo du lot.
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
